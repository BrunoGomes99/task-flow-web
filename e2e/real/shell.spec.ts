import { expect, type Page, test } from '@playwright/test';

import {
  closeDrawerIfOpen,
  expectSummaryCounts,
  expectThemePersisted,
  openSidebarWhenCollapsed,
  shellTitle,
  sidebar,
} from '../support/shell';
import { type Theme } from '../support/theme';
import { uniqueEmail } from '../support/unique-email';

const password = 'senha1234';
const name = 'Ana Costa';

test('shows the welcome toast and an empty summary, keeps the theme, and logs out', async ({
  page,
}) => {
  const email = uniqueEmail();

  await register(page, email);

  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(password);
  await page.getByRole('button', { name: 'Acessar Dashboard' }).click();

  await expect(page.getByText(`Bem-vindo(a) de volta, ${name}!`)).toBeVisible();
  await expect(page).toHaveURL(/\/tasks$/);
  await expect(shellTitle(page)).toBeVisible();

  await openSidebarWhenCollapsed(page);
  const panel = sidebar(page);
  await expect(panel.getByText(name, { exact: true })).toBeVisible();
  await expect(panel.getByText(email, { exact: true })).toBeVisible();
  await expectSummaryCounts(page, { pending: 0, inProgress: 0, completed: 0, total: 0 });

  await closeDrawerIfOpen(page);
  const theme = await toggleTheme(page);
  await expectThemePersisted(page, theme);

  await page.reload();

  await expect(page).toHaveURL(/\/tasks$/);
  await expect(shellTitle(page)).toBeVisible();
  await expectThemePersisted(page, theme);

  await openSidebarWhenCollapsed(page);
  await page.getByRole('button', { name: 'Sair da Conta' }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText('Sua sessão expirou. Faça login novamente.')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeAttached();

  await page.goto('/tasks');

  await expect(page).toHaveURL(/\/login$/);
  await expect(shellTitle(page)).toHaveCount(0);
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), 'taskflow.session'))
    .toBeNull();
});

async function register(page: Page, email: string): Promise<void> {
  await page.goto('/register');
  await page.getByLabel('Nome completo').fill(name);
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(password);
  await page.getByRole('button', { name: 'Cadastrar Conta' }).click();
  await expect(page).toHaveURL(/\/login$/);
}

async function toggleTheme(page: Page): Promise<Theme> {
  // The painted class is the current theme. Storage stays empty until the user chooses.
  const isDark = await page.locator('html').evaluate((root) => root.classList.contains('dark'));
  const next: Theme = isDark ? 'light' : 'dark';
  const action = next === 'dark' ? 'Ativar tema escuro' : 'Ativar tema claro';

  await page.getByRole('button', { name: action }).click();
  return next;
}
