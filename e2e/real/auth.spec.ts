import { expect, type Page, test } from '@playwright/test';

import { uniqueEmail } from '../support/unique-email';

const password = 'senha1234';

test('registers a unique user, shows the notice, logs in, and keeps the session after reload', async ({
  page,
}) => {
  const email = uniqueEmail();

  await register(page, email);

  await expect(page.getByRole('status')).toHaveText(
    'Conta criada com sucesso. Faça login para continuar.',
  );

  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(password);
  await page.getByRole('button', { name: 'Acessar Dashboard' }).click();

  await expect(page).toHaveURL(/\/tasks$/);
  await expect(page.getByRole('heading', { name: 'Quadro de Tarefas' })).toBeVisible();

  await page.reload();

  await expect(page).toHaveURL(/\/tasks$/);
  await expect(page.getByRole('heading', { name: 'Quadro de Tarefas' })).toBeVisible();
});

test('shows an inline message for a wrong password and keeps the typed e-mail', async ({
  page,
}) => {
  const email = uniqueEmail();
  await register(page, email);

  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill('errada123');
  await page.getByRole('button', { name: 'Acessar Dashboard' }).click();

  await expect(page.getByRole('alert')).toHaveText('E-mail ou senha inválidos.');
  await expect(page.getByLabel('E-mail')).toHaveValue(email);
  await expect(page).toHaveURL(/\/login$/);
});

test('shows an inline e-mail error when the same e-mail is registered twice', async ({ page }) => {
  const email = uniqueEmail();
  await register(page, email);

  await page.goto('/register');
  await page.getByLabel('Nome completo').fill('Maria Silva');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(password);
  await page.getByRole('button', { name: 'Cadastrar Conta' }).click();

  await expect(page.getByLabel('E-mail')).toHaveAccessibleDescription('Este e-mail já está em uso');
  await expect(page).toHaveURL(/\/register$/);
});

async function register(page: Page, email: string): Promise<void> {
  await page.goto('/register');
  await page.getByLabel('Nome completo').fill('Maria Silva');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(password);
  await page.getByRole('button', { name: 'Cadastrar Conta' }).click();
  await expect(page).toHaveURL(/\/login$/);
}
