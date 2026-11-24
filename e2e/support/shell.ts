import { expect, type Locator, type Page } from '@playwright/test';

import { themeStorageKey, type Theme } from './theme';

/** The shell header title. The placeholder board repeats the same heading in `<main>`. */
export function shellTitle(page: Page): Locator {
  return page.getByRole('banner').getByRole('heading', { name: 'Quadro de Tarefas' });
}

export function sidebar(page: Page): Locator {
  return page.getByRole('complementary', { name: 'Barra lateral' });
}

/** Below `lg` the sidebar is a drawer. On desktop the menu button is hidden. */
export async function openSidebarWhenCollapsed(page: Page): Promise<void> {
  const menu = page.getByRole('button', { name: 'Abrir menu' });
  if (!(await menu.isVisible())) {
    return;
  }

  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
}

/** The header is inert while the drawer is open, so the theme toggle needs it closed. */
export async function closeDrawerIfOpen(page: Page): Promise<void> {
  const menu = page.getByRole('button', { name: 'Abrir menu' });
  if (!(await menu.isVisible())) {
    return;
  }

  if ((await menu.getAttribute('aria-expanded')) !== 'true') {
    return;
  }

  await page.keyboard.press('Escape');
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
}

export async function expectSummaryCounts(
  page: Page,
  counts: { pending: number; inProgress: number; completed: number; total: number },
): Promise<void> {
  const panel = sidebar(page);
  await expect(countIn(panel, 'Pendente', counts.pending)).toBeVisible();
  await expect(countIn(panel, 'Em Andamento', counts.inProgress)).toBeVisible();
  await expect(countIn(panel, 'Concluída', counts.completed)).toBeVisible();
  await expect(
    panel.getByText('Suas Tarefas', { exact: true }).locator('..').getByText(String(counts.total), {
      exact: true,
    }),
  ).toBeVisible();
}

export async function expectThemePersisted(page: Page, theme: Theme): Promise<void> {
  const root = page.locator('html');
  if (theme === 'dark') {
    await expect(root).toHaveClass(/\bdark\b/);
  } else {
    await expect(root).not.toHaveClass(/\bdark\b/);
  }

  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), themeStorageKey))
    .toBe(theme);
}

function countIn(panel: Locator, label: string, count: number): Locator {
  return panel
    .getByRole('listitem')
    .filter({ hasText: label })
    .getByText(String(count), { exact: true });
}
