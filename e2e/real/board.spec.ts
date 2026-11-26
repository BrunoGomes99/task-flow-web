import { expect, type Locator, type Page, test } from '@playwright/test';

import { createBoardTask, openBoard, registerBoardUser, type BoardUser } from '../support/api';
import { shellTitle } from '../support/shell';

test('shows each task in its column and a counter that matches the total', async ({
  page,
  request,
}) => {
  const user = await registerBoardUser(request);
  await createBoardTask(request, user, { title: 'Planejar sprint', description: 'Primeira' });
  await createBoardTask(request, user, { title: 'Escrever critérios', description: 'Segunda' });
  await createBoardTask(request, user, {
    title: 'Implementar API',
    description: 'Em curso',
    status: 'inProgress',
  });
  await createBoardTask(request, user, {
    title: 'Publicar versão',
    description: 'Feito',
    status: 'completed',
  });

  await showBoard(page, user);

  const pending = column(page, 'Pendente');
  await expect(pending.getByRole('listitem')).toHaveCount(2);
  await expect(pending.getByRole('heading', { level: 3, name: 'Planejar sprint' })).toBeVisible();
  await expect(
    pending.getByRole('heading', { level: 3, name: 'Escrever critérios' }),
  ).toBeVisible();
  await expectCounter(page, 'Pendente', 2);
  await expect(
    column(page, 'Em Andamento').getByRole('heading', { level: 3, name: 'Implementar API' }),
  ).toBeVisible();
  await expectCounter(page, 'Em Andamento', 1);
  await expect(
    column(page, 'Concluída').getByRole('heading', { level: 3, name: 'Publicar versão' }),
  ).toBeVisible();
  await expectCounter(page, 'Concluída', 1);
  await expect(
    column(page, 'Concluída').getByRole('img', { name: 'Concluída (Travada)' }),
  ).toBeVisible();
});

test('keeps tasks without a due date last in both orders', async ({ page, request }) => {
  const user = await registerBoardUser(request);
  await createBoardTask(request, user, {
    title: 'Entrega tarde',
    dueDate: endOfLocalDay(2030, 11, 20),
  });
  await createBoardTask(request, user, { title: 'Entrega livre' });
  await createBoardTask(request, user, {
    title: 'Entrega cedo',
    dueDate: endOfLocalDay(2030, 3, 10),
  });

  await showBoard(page, user);

  const pending = column(page, 'Pendente');
  await expect(pending.getByRole('heading', { level: 3 })).toHaveText([
    'Entrega cedo',
    'Entrega tarde',
    'Entrega livre',
  ]);
  await expect(pending.getByRole('listitem').last().getByText('Sem prazo')).toBeVisible();

  await openFilters(page);
  await page.getByLabel('Ordenar por vencimento').selectOption('desc');

  await expect(page).toHaveURL(/order=desc/);
  await expect(pending.getByRole('heading', { level: 3 })).toHaveText([
    'Entrega tarde',
    'Entrega cedo',
    'Entrega livre',
  ]);
  await expect(pending.getByRole('listitem').last().getByText('Sem prazo')).toBeVisible();
});

test('combines title and description filters and keeps them after reload', async ({
  page,
  request,
}) => {
  const user = await registerBoardUser(request);
  await createBoardTask(request, user, {
    title: 'Alpha com banana',
    description: 'texto banana único',
  });
  await createBoardTask(request, user, {
    title: 'Alpha com maçã',
    description: 'texto maçã único',
  });
  await createBoardTask(request, user, {
    title: 'Beta com banana',
    description: 'texto banana extra',
  });

  await showBoard(page, user);
  await openFilters(page);
  await page.getByLabel('Filtrar por título').fill('Alpha');
  await page.getByLabel('Filtrar por descrição').fill('banana');

  await expect(page).toHaveURL(/title=Alpha/);
  await expect(page).toHaveURL(/description=banana/);
  const pending = column(page, 'Pendente');
  await expect(pending.getByRole('heading', { level: 3 })).toHaveText(['Alpha com banana']);
  await expectCounter(page, 'Pendente', 1);

  await page.reload();

  await expect(shellTitle(page)).toBeVisible();
  await expect(pending.getByRole('heading', { level: 3 })).toHaveText(['Alpha com banana']);
  await expectCounter(page, 'Pendente', 1);
  await openFilters(page);
  await expect(page.getByLabel('Filtrar por título')).toHaveValue('Alpha');
  await expect(page.getByLabel('Filtrar por descrição')).toHaveValue('banana');
});

test('hides a column when its status is removed', async ({ page, request }) => {
  const user = await registerBoardUser(request);
  await createBoardTask(request, user, { title: 'Planejar sprint' });
  await createBoardTask(request, user, { title: 'Implementar API', status: 'inProgress' });
  await createBoardTask(request, user, { title: 'Publicar versão', status: 'completed' });

  await showBoard(page, user);
  await openFilters(page);
  await page.getByRole('button', { name: 'Colunas visíveis' }).click();
  await page.getByRole('option', { name: 'Concluída', exact: true }).click();

  await expect(page).toHaveURL(/status=pending(?:,|%2C)inProgress/);
  await expect(column(page, 'Concluída')).toHaveCount(0);
  await expect(
    column(page, 'Pendente').getByRole('heading', { level: 3, name: 'Planejar sprint' }),
  ).toBeVisible();
  await expect(
    column(page, 'Em Andamento').getByRole('heading', { level: 3, name: 'Implementar API' }),
  ).toBeVisible();
});

async function showBoard(page: Page, user: BoardUser): Promise<void> {
  await openBoard(page, user);
  await expect(shellTitle(page)).toBeVisible();
}

function column(page: Page, name: string): Locator {
  return page.getByRole('region', { name, exact: true });
}

async function expectCounter(page: Page, name: string, count: number): Promise<void> {
  await expect(
    column(page, name).locator('header').getByText(String(count), { exact: true }),
  ).toBeVisible();
}

async function openFilters(page: Page): Promise<void> {
  const toggle = page.getByRole('button', { name: 'Filtros', exact: true });
  if (await toggle.isVisible()) {
    if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
      await toggle.click();
    }
  }

  await expect(page.getByLabel('Filtrar por título')).toBeVisible();
}

function endOfLocalDay(year: number, month: number, day: number): string {
  return new Date(year, month - 1, day, 23, 59, 59, 0).toISOString();
}
