import { expect, type Locator, type Page, type Route, test } from '@playwright/test';

import type {
  PagedTaskDto,
  ProblemDetails,
  TaskDto,
  TaskStatus,
  TaskSummaryDto,
  UserDto,
} from '../../src/app/core/api/api-models';
import { installBoardSession } from '../support/api';
import { expectNoAxeViolations } from '../support/axe';
import { shellTitle } from '../support/shell';
import { setTheme, type Theme } from '../support/theme';

const profile = {
  id: '6f1b1c3a-6a1e-4c2a-9c1a-3b7e8d2f4a10',
  name: 'Maria Silva',
  email: 'maria@taskflow.test',
  createdAt: '2026-01-15T12:00:00.000Z',
} satisfies UserDto;

const serverError = {
  type: 'about:blank',
  title: 'Internal Server Error',
  status: 500,
  detail: 'Unexpected failure.',
} satisfies ProblemDetails;

const themes: readonly Theme[] = ['light', 'dark'];
const pageSize = 20;

interface MockTask {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly status: TaskStatus;
  readonly dueDate: string | null;
}

interface TaskRequest {
  readonly status: string;
  readonly pageNumber: number;
}

test('loads forty-five tasks in one column across three pages and then stops', async ({ page }) => {
  const tasks = pendingTasks(45);
  const requested = await mockBoard(page, tasks);

  await openBoard(page);

  const pending = column(page, 'Pendente');
  const items = pending.getByRole('listitem');
  await expect(items.first()).toBeVisible();

  await expect
    .poll(
      async () => {
        const count = await items.count();
        if (count < tasks.length) {
          await scrollColumn(pending);
        }
        return count;
      },
      { timeout: 15_000 },
    )
    .toBe(tasks.length);

  expect(pageNumbers(requested, 'pending')).toEqual([1, 2, 3]);
  await expect(pending.locator('header').getByText('45', { exact: true })).toBeVisible();

  // The sentinel is disabled once the column is full. A late next page would arrive here.
  await scrollColumn(pending);
  await page.waitForTimeout(300);
  expect(pageNumbers(requested, 'pending')).toEqual([1, 2, 3]);
  await expect(items).toHaveCount(45);
});

test('shows an empty state when a column has no tasks', async ({ page }) => {
  const requested = await mockBoard(page, []);

  await openBoard(page);
  await expect.poll(() => requested.length).toBe(3);
  await expect(page.getByLabel('Carregando tarefas')).toHaveCount(0);

  for (const name of ['Pendente', 'Em Andamento', 'Concluída']) {
    const panel = column(page, name);
    await expect(panel.getByText('Nenhuma tarefa nesta coluna')).toBeVisible();
    await expect(panel.locator('header').getByText('0', { exact: true })).toBeVisible();
  }
});

test('shows the overdue badge for a past due date', async ({ page }) => {
  const dueAt = new Date(2020, 0, 15, 12, 0, 0, 0);
  const dueLabel = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(dueAt);
  const dueDate = dueAt.toISOString();

  await mockBoard(page, [
    {
      id: idFor(1),
      title: 'Pagar fornecedor',
      description: 'Nota vencida',
      status: 'pending',
      dueDate,
    },
    {
      id: idFor(2),
      title: 'Arquivar contrato',
      description: 'Já encerrado',
      status: 'completed',
      dueDate,
    },
  ]);

  await openBoard(page);

  const pending = column(page, 'Pendente');
  await expect(pending.getByText(`${dueLabel} (Atrasada)`)).toBeVisible();
  const completed = column(page, 'Concluída');
  await expect(completed.getByText(dueLabel, { exact: true })).toBeVisible();
  await expect(completed.getByText('(Atrasada)')).toHaveCount(0);
  await expect(completed.getByRole('img', { name: 'Concluída (Travada)' })).toBeVisible();
});

test('shows the column error and retries when one column returns 500', async ({ page }) => {
  await mockBoard(
    page,
    [
      {
        id: idFor(1),
        title: 'Planejar sprint',
        description: 'Ainda dá',
        status: 'pending',
        dueDate: null,
      },
      {
        id: idFor(2),
        title: 'Revisar pull request',
        description: 'Em curso',
        status: 'inProgress',
        dueDate: null,
      },
    ],
    'inProgress',
  );

  await openBoard(page);

  const inProgress = column(page, 'Em Andamento');
  await expect(inProgress.getByRole('alert')).toHaveText('Não foi possível carregar esta coluna.');
  await expect(
    column(page, 'Pendente').getByRole('heading', { level: 3, name: 'Planejar sprint' }),
  ).toBeVisible();

  await inProgress.getByRole('button', { name: 'Tentar novamente' }).click();

  await expect(
    inProgress.getByRole('heading', { level: 3, name: 'Revisar pull request' }),
  ).toBeVisible();
  await expect(inProgress.getByRole('alert')).toHaveCount(0);
});

for (const theme of themes) {
  test(`board has no WCAG A/AA violations in the ${theme} theme`, async ({ page }) => {
    await setTheme(page, theme);
    const dueAt = new Date(2020, 0, 15, 12, 0, 0, 0);
    await mockBoard(page, [
      {
        id: idFor(1),
        title: 'Pagar fornecedor',
        description: 'Nota vencida',
        status: 'pending',
        dueDate: dueAt.toISOString(),
      },
      {
        id: idFor(2),
        title: 'Implementar API',
        description: 'Endpoint de listagem',
        status: 'inProgress',
        dueDate: null,
      },
      {
        id: idFor(3),
        title: 'Publicar versão',
        description: 'Já no ar',
        status: 'completed',
        dueDate: null,
      },
    ]);

    await openBoard(page);

    const root = page.locator('html');
    if (theme === 'dark') {
      await expect(root).toHaveClass(/\bdark\b/);
    } else {
      await expect(root).not.toHaveClass(/\bdark\b/);
    }

    await expect(column(page, 'Pendente').getByText('(Atrasada)')).toBeVisible();
    await expect(
      column(page, 'Concluída').getByRole('img', { name: 'Concluída (Travada)' }),
    ).toBeVisible();
    await expectNoAxeViolations(page);
  });
}

async function openBoard(page: Page): Promise<void> {
  await installBoardSession(page, {
    accessToken: 'e2e-valid-token',
    expiresAt: Date.now() + 60 * 60 * 1000,
  });
  await page.goto('/tasks');
  await expect(shellTitle(page)).toBeVisible();
}

async function mockBoard(
  page: Page,
  tasks: readonly MockTask[],
  failFirst?: TaskStatus,
): Promise<TaskRequest[]> {
  const requested: TaskRequest[] = [];
  let failed = false;

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === '/api/users/me') {
      await fulfillJson(route, 200, profile);
      return;
    }

    if (url.pathname === '/api/tasks/summary') {
      await fulfillJson(route, 200, summaryOf(tasks));
      return;
    }

    if (url.pathname === '/api/tasks' && route.request().method() === 'GET') {
      const status = readStatus(url);
      const pageNumber = readPage(url, 'pageNumber');
      const size = readPage(url, 'pageSize');
      if (size > pageSize) {
        throw new Error(`pageSize ${size} is above ${pageSize}.`);
      }

      requested.push({ status, pageNumber });
      if (failFirst === status && !failed) {
        failed = true;
        await fulfillJson(route, 500, serverError);
        return;
      }

      const matching = tasks.filter((task) => task.status === status);
      const start = (pageNumber - 1) * size;
      const body: PagedTaskDto = {
        items: matching.slice(start, start + size).map(toDto),
        pageNumber,
        pageSize: size,
        totalCount: matching.length,
      };
      await fulfillJson(route, 200, body);
      return;
    }

    throw new Error(`Unexpected API call: ${route.request().method()} ${url.pathname}`);
  });

  return requested;
}

function pendingTasks(count: number): MockTask[] {
  return Array.from({ length: count }, (_, index) => ({
    id: idFor(index + 1),
    title: `Tarefa ${index + 1}`,
    description: `Descrição da tarefa ${index + 1}`,
    status: 'pending',
    dueDate: null,
  }));
}

function idFor(index: number): string {
  return `00000000-0000-4000-8000-${index.toString(16).padStart(12, '0')}`;
}

function toDto(task: MockTask): TaskDto {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    dueDate: task.dueDate,
    createdAt: '2026-01-15T12:00:00.000Z',
    updatedAt: '2026-01-15T12:00:00.000Z',
  };
}

function summaryOf(tasks: readonly MockTask[]): TaskSummaryDto {
  const pending = tasks.filter((task) => task.status === 'pending').length;
  const inProgress = tasks.filter((task) => task.status === 'inProgress').length;
  const completed = tasks.filter((task) => task.status === 'completed').length;
  return { pending, inProgress, completed, total: tasks.length };
}

function readStatus(url: URL): TaskStatus {
  const status = url.searchParams.get('status');
  if (status === 'pending' || status === 'inProgress' || status === 'completed') {
    return status;
  }

  throw new Error(`Unexpected status: ${status}`);
}

function readPage(url: URL, name: string): number {
  const raw = url.searchParams.get(name);
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`Unexpected ${name}: ${raw}`);
  }

  return value;
}

function pageNumbers(requested: readonly TaskRequest[], status: string): number[] {
  return requested.filter((entry) => entry.status === status).map((entry) => entry.pageNumber);
}

function column(page: Page, name: string): Locator {
  return page.getByRole('region', { name, exact: true });
}

async function scrollColumn(panel: Locator): Promise<void> {
  const list = panel.getByRole('list');
  if ((await list.count()) === 0) {
    return;
  }

  await list.evaluate((element) => {
    const scroller = element.parentElement;
    if (scroller === null) {
      return;
    }

    scroller.scrollTop = scroller.scrollHeight;
  });
}

async function fulfillJson(route: Route, status: number, body: unknown): Promise<void> {
  await route.fulfill({
    status,
    contentType: status === 500 ? 'application/problem+json' : 'application/json',
    body: JSON.stringify(body),
  });
}
