import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import type { Observable } from 'rxjs';
import { Subject } from 'rxjs';

import { BoardStore } from '../../data-access/board-store';
import { TasksApi, type TaskListQuery, type TaskPage } from '../../data-access/tasks-api';
import type { Task, TaskStatus } from '../../models/task';
import { BoardPage } from './board-page';

interface PendingList {
  readonly query: TaskListQuery;
  readonly response: Subject<TaskPage>;
}

class FakeTasksApi {
  readonly calls: PendingList[] = [];

  list(query: TaskListQuery): Observable<TaskPage> {
    const response = new Subject<TaskPage>();
    this.calls.push({ query, response });
    return response.asObservable();
  }
}

describe('BoardPage', () => {
  let api: FakeTasksApi;

  beforeEach(() => {
    api = new FakeTasksApi();
    TestBed.configureTestingModule({
      teardown: { destroyAfterEach: true },
      providers: [
        provideRouter([
          {
            path: 'tasks',
            component: BoardPage,
            providers: [BoardStore],
          },
        ]),
        provideLocationMocks(),
        { provide: TasksApi, useValue: api },
      ],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('restores filters and columns from the URL', async () => {
    const harness = await open('/tasks?title=abc&status=pending,inProgress&order=desc');

    expect(queryOf(routerUrl())).toEqual({
      title: 'abc',
      status: 'pending,inProgress',
      order: 'desc',
    });
    expect(titleInput()).toHaveValue('abc');
    expect(orderSelect()).toHaveValue('desc');
    expect(screen.queryByRole('heading', { name: 'Concluída' })).not.toBeInTheDocument();

    await vi.waitFor(() => {
      expect(api.calls.map((call) => call.query)).toEqual([
        { status: 'pending', page: 1, title: 'abc', description: '', order: 'desc' },
        { status: 'inProgress', page: 1, title: 'abc', description: '', order: 'desc' },
      ]);
    });

    for (const call of api.calls) {
      call.response.next(pageOf(call.query.status));
      call.response.complete();
    }
    await settle(harness);

    expect(within(column('Pendente')).getByText('Tarefa pending')).toBeInTheDocument();
    expect(within(column('Em Andamento')).getByText('Tarefa inProgress')).toBeInTheDocument();
  });

  it('replaces an invalid query with the canonical filters', async () => {
    const harness = await open('/tasks?status=completed,foo&order=sideways');

    await vi.waitFor(() => {
      expect(queryOf(routerUrl())).toEqual({ status: 'completed' });
    });
    await settle(harness);

    expect(screen.getByRole('heading', { name: 'Concluída' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Pendente' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Em Andamento' })).not.toBeInTheDocument();
    expect(orderSelect()).toHaveValue('asc');
  });

  it('keeps status and order changes in history for back and forward', async () => {
    const user = userEvent.setup();
    const harness = await open('/tasks');

    await user.selectOptions(orderSelect(), 'desc');
    await settle(harness);
    expect(queryOf(routerUrl())).toEqual({ order: 'desc' });

    await user.click(screen.getByRole('button', { name: 'Colunas visíveis' }));
    await user.click(await screen.findByRole('option', { name: 'Concluída' }));
    await settle(harness);
    expect(queryOf(routerUrl())).toEqual({ status: 'pending,inProgress', order: 'desc' });
    expect(screen.queryByRole('heading', { name: 'Concluída' })).not.toBeInTheDocument();

    await goBack(harness);
    expect(queryOf(routerUrl())).toEqual({ order: 'desc' });
    expect(screen.getByRole('heading', { name: 'Concluída' })).toBeInTheDocument();
    expect(orderSelect()).toHaveValue('desc');

    await goBack(harness);
    expect(queryOf(routerUrl())).toEqual({});
    expect(orderSelect()).toHaveValue('asc');

    await goForward(harness);
    expect(queryOf(routerUrl())).toEqual({ order: 'desc' });
    expect(screen.getByRole('heading', { name: 'Pendente' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Em Andamento' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Concluída' })).toBeInTheDocument();
  });

  it('replaces the current history entry while typing a text filter', async () => {
    const user = userEvent.setup();
    const harness = await open('/tasks');

    await user.selectOptions(orderSelect(), 'desc');
    await settle(harness);

    await user.type(titleInput(), 'a');
    await settle(harness);
    expect(queryOf(routerUrl())).toEqual({ title: 'a', order: 'desc' });

    await user.type(titleInput(), 'b');
    await settle(harness);
    expect(queryOf(routerUrl())).toEqual({ title: 'ab', order: 'desc' });

    await goBack(harness);
    expect(queryOf(routerUrl())).toEqual({});
    expect(titleInput()).toHaveValue('');
  });
});

async function open(url: string): Promise<RouterTestingHarness> {
  const harness = await RouterTestingHarness.create(url);
  // TestBed does not bootstrap the app, so the router never subscribes to popstate.
  TestBed.inject(Router).initialNavigation();
  return harness;
}

async function settle(harness: RouterTestingHarness): Promise<void> {
  TestBed.tick();
  harness.detectChanges();
  await TestBed.inject(ApplicationRef).whenStable();
}

async function goBack(harness: RouterTestingHarness): Promise<void> {
  const current = routerUrl();
  TestBed.inject(Location).back();
  await vi.waitFor(() => {
    expect(routerUrl()).not.toBe(current);
  });
  await settle(harness);
}

async function goForward(harness: RouterTestingHarness): Promise<void> {
  const current = routerUrl();
  TestBed.inject(Location).forward();
  await vi.waitFor(() => {
    expect(routerUrl()).not.toBe(current);
  });
  await settle(harness);
}

function routerUrl(): string {
  return TestBed.inject(Router).url;
}

function queryOf(url: string): Record<string, string> {
  const query = url.split('?')[1] ?? '';
  return Object.fromEntries(new URLSearchParams(query));
}

function titleInput(): HTMLElement {
  return screen.getByRole('textbox', { name: 'Filtrar por título' });
}

function orderSelect(): HTMLElement {
  return screen.getByRole('combobox', { name: 'Ordenar por vencimento' });
}

function column(name: string): HTMLElement {
  return screen.getByRole('region', { name });
}

function pageOf(status: TaskStatus): TaskPage {
  return {
    items: [task(status)],
    totalCount: 1,
    pageNumber: 1,
  };
}

function task(status: TaskStatus): Task {
  return {
    id: `task-${status}`,
    title: `Tarefa ${status}`,
    description: '',
    status,
    dueAt: null,
    createdAt: new Date('2026-11-20T15:00:00.000Z'),
    updatedAt: new Date('2026-11-20T15:00:00.000Z'),
  };
}
