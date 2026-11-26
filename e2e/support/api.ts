import { type APIRequestContext, type Page } from '@playwright/test';

import type { TaskStatus } from '../../src/app/core/api/api-models';
import { uniqueEmail } from './unique-email';

/** Same key SessionStore writes: `{ accessToken, expiresAt }`. */
const sessionStorageKey = 'taskflow.session';
const password = 'senha1234';

export interface BoardUser {
  readonly name: string;
  readonly email: string;
  readonly accessToken: string;
  readonly expiresIn: number;
}

export interface BoardTaskInput {
  readonly title: string;
  readonly description?: string;
  readonly dueDate?: string;
  readonly status?: TaskStatus;
}

export async function registerBoardUser(
  request: APIRequestContext,
  name = 'Maria Silva',
): Promise<BoardUser> {
  const email = uniqueEmail();

  const registered = await request.post('/api/users/register', {
    data: { name, email, password },
  });
  if (registered.status() !== 201) {
    throw new Error(
      `POST /api/users/register returned ${registered.status()}: ${await registered.text()}`,
    );
  }

  const loggedIn = await request.post('/api/users/login', {
    data: { email, password },
  });
  if (loggedIn.status() !== 200) {
    throw new Error(
      `POST /api/users/login returned ${loggedIn.status()}: ${await loggedIn.text()}`,
    );
  }

  const loginBody: unknown = await loggedIn.json();
  return {
    name,
    email,
    accessToken: readText(loginBody, 'accessToken'),
    expiresIn: readPositiveNumber(loginBody, 'expiresIn'),
  };
}

export async function createBoardTask(
  request: APIRequestContext,
  user: BoardUser,
  task: BoardTaskInput,
): Promise<string> {
  const data: { title: string; description?: string; dueDate?: string } = { title: task.title };
  if (task.description !== undefined) {
    data.description = task.description;
  }
  if (task.dueDate !== undefined) {
    data.dueDate = task.dueDate;
  }

  const created = await request.post('/api/tasks', {
    headers: authHeaders(user),
    data,
  });
  if (created.status() !== 201) {
    throw new Error(`POST /api/tasks returned ${created.status()}: ${await created.text()}`);
  }

  const id = readText(await created.json(), 'id');
  const status = task.status ?? 'pending';
  if (status !== 'pending') {
    await changeBoardTaskStatus(request, user, id, status);
  }

  return id;
}

export async function changeBoardTaskStatus(
  request: APIRequestContext,
  user: BoardUser,
  taskId: string,
  status: TaskStatus,
): Promise<void> {
  const updated = await request.patch(`/api/tasks/${taskId}/status`, {
    headers: authHeaders(user),
    data: { status },
  });
  if (updated.status() !== 204) {
    throw new Error(
      `PATCH /api/tasks/${taskId}/status returned ${updated.status()}: ${await updated.text()}`,
    );
  }
}

/** Plants the session before Angular boots. The board has no create UI until Phase 5. */
export async function installBoardSession(
  page: Page,
  session: { accessToken: string; expiresAt: number },
): Promise<void> {
  await page.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, value);
    },
    { key: sessionStorageKey, value: JSON.stringify(session) },
  );
}

export async function openBoard(page: Page, user: BoardUser, path = '/tasks'): Promise<void> {
  await installBoardSession(page, {
    accessToken: user.accessToken,
    expiresAt: Date.now() + user.expiresIn * 1000,
  });
  await page.goto(path);
}

function authHeaders(user: BoardUser): { authorization: string } {
  return { authorization: `Bearer ${user.accessToken}` };
}

function readText(body: unknown, field: string): string {
  if (!isRecord(body)) {
    throw new Error(`API response is missing ${field}.`);
  }

  const value = body[field];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`API response is missing ${field}.`);
  }

  return value;
}

function readPositiveNumber(body: unknown, field: string): number {
  if (!isRecord(body)) {
    throw new Error(`API response is missing ${field}.`);
  }

  const value = body[field];
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error(`API response is missing ${field}.`);
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
