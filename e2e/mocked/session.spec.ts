import { expect, type Page, type Route, test } from '@playwright/test';

import type { ProblemDetails, UserDto } from '../../src/app/core/api/api-models';
import { expectNoAxeViolations } from '../support/axe';
import { setTheme, type Theme } from '../support/theme';

/** Same key SessionStore writes: `{ accessToken, expiresAt }`. */
const sessionStorageKey = 'taskflow.session';

const profile = {
  id: '6f1b1c3a-6a1e-4c2a-9c1a-3b7e8d2f4a10',
  name: 'Maria Silva',
  email: 'maria@taskflow.test',
  createdAt: '2026-01-15T12:00:00.000Z',
} satisfies UserDto;

const unauthorized = {
  type: 'about:blank',
  title: 'Unauthorized',
  status: 401,
  detail: 'The access token was rejected.',
  code: 'auth.invalid_credentials',
} satisfies ProblemDetails;

const themes: readonly Theme[] = ['light', 'dark'];
const authPages = [
  { path: '/login', heading: 'Entrar' },
  { path: '/register', heading: 'Criar Conta' },
] as const;

test('redirects to login with the expired notice when an authenticated request returns 401', async ({
  page,
}) => {
  const token = 'e2e-rejected-token';
  await seedSession(page, { accessToken: token, expiresAt: Date.now() + 60 * 60 * 1000 });

  let sawAuthenticatedRequest = false;
  await page.route('**/api/users/me', async (route) => {
    expect(route.request().method()).toBe('GET');
    expect(route.request().headers()['authorization']).toBe(`Bearer ${token}`);
    sawAuthenticatedRequest = true;
    await fulfillJson(route, 401, unauthorized);
  });

  await page.goto('/tasks');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('status')).toHaveText('Sua sessão expirou. Faça login novamente.');
  await expect(page.getByRole('heading', { name: 'Quadro de Tarefas' })).toHaveCount(0);
  await expectSessionCleared(page);
  expect(sawAuthenticatedRequest).toBe(true);
});

test('discards a stored session whose expiresAt is in the past', async ({ page }) => {
  await seedSession(page, { accessToken: 'e2e-expired-token', expiresAt: Date.now() - 60_000 });

  let profileRequests = 0;
  await page.route('**/api/users/me', async (route) => {
    profileRequests += 1;
    await fulfillJson(route, 401, unauthorized);
  });

  await page.goto('/tasks');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText('Sua sessão expirou. Faça login novamente.')).toHaveCount(0);
  await expect(page.getByLabel('E-mail')).toBeVisible();
  await expectSessionCleared(page);
  expect(profileRequests).toBe(0);
});

test('sends a guest from the board to login', async ({ page }) => {
  await page.goto('/tasks');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeAttached();
  await expect(page.getByLabel('E-mail')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Quadro de Tarefas' })).toHaveCount(0);
});

test('sends a logged-in user from login to the board', async ({ page }) => {
  await seedSession(page, {
    accessToken: 'e2e-valid-token',
    expiresAt: Date.now() + 60 * 60 * 1000,
  });
  await page.route('**/api/users/me', async (route) => {
    expect(route.request().headers()['authorization']).toBe('Bearer e2e-valid-token');
    await fulfillJson(route, 200, profile);
  });

  await page.goto('/login');

  await expect(page).toHaveURL(/\/tasks$/);
  await expect(page.getByRole('heading', { name: 'Quadro de Tarefas' })).toBeVisible();
});

for (const theme of themes) {
  for (const authPage of authPages) {
    test(`${authPage.path} has no WCAG A/AA violations in the ${theme} theme`, async ({ page }) => {
      await setTheme(page, theme);
      await page.goto(authPage.path);

      const root = page.locator('html');
      if (theme === 'dark') {
        await expect(root).toHaveClass(/\bdark\b/);
      } else {
        await expect(root).not.toHaveClass(/\bdark\b/);
      }

      await expect(page.getByRole('heading', { name: authPage.heading })).toBeAttached();
      await expect(
        page.getByLabel(authPage.path === '/register' ? 'Nome completo' : 'E-mail'),
      ).toBeVisible();
      await expectNoAxeViolations(page);
    });
  }
}

async function seedSession(
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

async function expectSessionCleared(page: Page): Promise<void> {
  await expect
    .poll(async () => page.evaluate((key) => localStorage.getItem(key), sessionStorageKey))
    .toBeNull();
}

async function fulfillJson(route: Route, status: number, body: unknown): Promise<void> {
  await route.fulfill({
    status,
    contentType: status === 401 ? 'application/problem+json' : 'application/json',
    body: JSON.stringify(body),
  });
}
