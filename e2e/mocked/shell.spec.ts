import { expect, type Page, type Route, test } from '@playwright/test';

import type { ProblemDetails, TaskSummaryDto, UserDto } from '../../src/app/core/api/api-models';
import { expectNoAxeViolations } from '../support/axe';
import {
  expectSummaryCounts,
  openSidebarWhenCollapsed,
  shellTitle,
  sidebar,
} from '../support/shell';
import { setTheme, type Theme } from '../support/theme';

/** Same key SessionStore writes: `{ accessToken, expiresAt }`. */
const sessionStorageKey = 'taskflow.session';

const profile = {
  id: '6f1b1c3a-6a1e-4c2a-9c1a-3b7e8d2f4a10',
  name: 'Maria Silva',
  email: 'maria@taskflow.test',
  createdAt: '2026-01-15T12:00:00.000Z',
} satisfies UserDto;

const largeSummary = {
  pending: 12840,
  inProgress: 35671,
  completed: 90412,
  total: 138923,
} satisfies TaskSummaryDto;

const emptySummary = {
  pending: 0,
  inProgress: 0,
  completed: 0,
  total: 0,
} satisfies TaskSummaryDto;

const serverError = {
  type: 'about:blank',
  title: 'Internal Server Error',
  status: 500,
  detail: 'Unexpected failure.',
} satisfies ProblemDetails;

const themes: readonly Theme[] = ['light', 'dark'];

test('renders a summary with large numbers', async ({ page }) => {
  await openShell(page, largeSummary);

  await openSidebarWhenCollapsed(page);
  await expectSummaryCounts(page, {
    pending: 12840,
    inProgress: 35671,
    completed: 90412,
    total: 138923,
  });
});

test('shows the summary error and the global toast when the summary returns 500', async ({
  page,
}) => {
  await openShell(page, 'error');

  await expect(page.getByRole('alert')).toContainText(
    'Ocorreu um erro inesperado. Tente novamente.',
  );
  await openSidebarWhenCollapsed(page);
  await expect(sidebar(page).getByText('Não foi possível carregar o resumo')).toBeVisible();
  await expect(sidebar(page).getByRole('listitem')).toHaveCount(0);
});

for (const theme of themes) {
  test(`shell has no WCAG A/AA violations in the ${theme} theme`, async ({ page }) => {
    await setTheme(page, theme);
    await openShell(page, emptySummary);

    const root = page.locator('html');
    if (theme === 'dark') {
      await expect(root).toHaveClass(/\bdark\b/);
    } else {
      await expect(root).not.toHaveClass(/\bdark\b/);
    }

    await openSidebarWhenCollapsed(page);
    await expect(sidebar(page).getByText('Resumo Geral')).toBeVisible();
    await expectNoAxeViolations(page);
  });
}

async function openShell(page: Page, summary: TaskSummaryDto | 'error'): Promise<void> {
  await seedSession(page, {
    accessToken: 'e2e-valid-token',
    expiresAt: Date.now() + 60 * 60 * 1000,
  });
  await page.route('**/api/users/me', async (route) => {
    await fulfillJson(route, 200, profile);
  });
  await page.route('**/api/tasks/summary', async (route) => {
    if (summary === 'error') {
      await fulfillJson(route, 500, serverError);
      return;
    }

    await fulfillJson(route, 200, summary);
  });

  await page.goto('/tasks');
  await expect(shellTitle(page)).toBeVisible();
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

async function fulfillJson(route: Route, status: number, body: unknown): Promise<void> {
  await route.fulfill({
    status,
    contentType: status === 500 ? 'application/problem+json' : 'application/json',
    body: JSON.stringify(body),
  });
}
