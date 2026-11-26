import { type WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { type Observable, Subject } from 'rxjs';

import { DEFAULT_BOARD_FILTERS, type BoardFilters } from '../models/board-filters';
import type { Task, TaskStatus } from '../models/task';
import { tasksRoutes } from '../tasks.routes';
import { BoardStore } from './board-store';
import { TasksApi, type TaskListQuery, type TaskPage } from './tasks-api';

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

function filters(overrides: Partial<BoardFilters> = {}): BoardFilters {
  return { ...DEFAULT_BOARD_FILTERS, ...overrides };
}

function task(id: string, status: TaskStatus): Task {
  return {
    id,
    title: id,
    description: '',
    status,
    dueAt: null,
    createdAt: new Date('2026-11-20T15:00:00.000Z'),
    updatedAt: new Date('2026-11-20T15:00:00.000Z'),
  };
}

describe('BoardStore', () => {
  let api: FakeTasksApi;
  let store: BoardStore;

  beforeEach(() => {
    vi.useFakeTimers();
    api = new FakeTasksApi();
    TestBed.configureTestingModule({
      providers: [BoardStore, { provide: TasksApi, useValue: api }],
    });
    store = TestBed.inject(BoardStore);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  function connect(initial: BoardFilters = DEFAULT_BOARD_FILTERS): WritableSignal<BoardFilters> {
    const current = signal(initial);
    store.connect(current);
    return current;
  }

  function settle(): void {
    TestBed.tick();
    vi.advanceTimersByTime(300);
  }

  function column(status: TaskStatus) {
    const found = store.columns().find((item) => item.status === status);
    if (found === undefined) {
      throw new Error(`Column ${status} is hidden.`);
    }
    return found;
  }

  function lastCall(status: TaskStatus): PendingList {
    const found = api.calls.filter((call) => call.query.status === status).at(-1);
    if (found === undefined) {
      throw new Error(`No request for ${status}.`);
    }
    return found;
  }

  it('is provided on the board route', () => {
    expect(tasksRoutes.find((route) => route.path === '')?.providers ?? []).toContain(BoardStore);
  });

  it('reads the filters signal without waiting for the reload', () => {
    const current = connect(filters({ title: 'boleto' }));

    expect(store.filters()).toEqual(filters({ title: 'boleto' }));
    expect(api.calls).toHaveLength(0);

    current.set(filters({ description: 'luz' }));
    TestBed.tick();

    expect(store.filters()).toEqual(filters({ description: 'luz' }));
    expect(current().description).toBe('luz');
  });

  it('loads page 1 of each visible column after 300 ms, in board order', () => {
    connect(filters({ title: 'boleto', description: 'luz', order: 'desc' }));
    settle();

    expect(api.calls.map((call) => call.query)).toEqual([
      { status: 'pending', page: 1, title: 'boleto', description: 'luz', order: 'desc' },
      { status: 'inProgress', page: 1, title: 'boleto', description: 'luz', order: 'desc' },
      { status: 'completed', page: 1, title: 'boleto', description: 'luz', order: 'desc' },
    ]);
    expect(store.columns().map((item) => item.status)).toEqual([
      'pending',
      'inProgress',
      'completed',
    ]);
    expect(column('pending')).toMatchObject({
      loading: true,
      loadingMore: false,
      items: [],
      error: false,
      hasMore: false,
    });

    lastCall('pending').response.next({
      items: [task('a', 'pending')],
      totalCount: 2,
      pageNumber: 1,
    });
    lastCall('inProgress').response.next({
      items: [task('b', 'inProgress')],
      totalCount: 1,
      pageNumber: 1,
    });
    lastCall('completed').response.next({ items: [], totalCount: 0, pageNumber: 1 });

    expect(column('pending')).toMatchObject({
      loading: false,
      loadedPages: 1,
      totalCount: 2,
      hasMore: true,
      error: false,
    });
    expect(column('pending').items.map((item) => item.id)).toEqual(['a']);
    expect(column('inProgress')).toMatchObject({ hasMore: false, totalCount: 1 });
    expect(column('completed')).toMatchObject({ items: [], totalCount: 0, hasMore: false });
  });

  it('waits 300 ms and loads only the latest filters in that window', () => {
    const current = connect(filters({ title: 'a' }));
    TestBed.tick();
    vi.advanceTimersByTime(299);
    expect(api.calls).toHaveLength(0);

    current.set(filters({ title: 'ab' }));
    TestBed.tick();
    vi.advanceTimersByTime(299);
    expect(api.calls).toHaveLength(0);

    vi.advanceTimersByTime(1);

    expect(api.calls.map((call) => call.query.title)).toEqual(['ab', 'ab', 'ab']);
    expect(api.calls.map((call) => call.query.status)).toEqual([
      'pending',
      'inProgress',
      'completed',
    ]);
  });

  it('does not reload when the filter value is unchanged', () => {
    const current = connect();
    settle();
    expect(api.calls).toHaveLength(3);

    current.set(filters());
    settle();

    expect(api.calls).toHaveLength(3);
  });

  it('stops loading a hidden column and keeps the others in board order', () => {
    const current = connect();
    settle();

    current.set(filters({ statuses: ['completed', 'inProgress'] }));
    settle();

    expect(store.columns().map((item) => item.status)).toEqual(['inProgress', 'completed']);
    expect(api.calls.slice(3).map((call) => call.query)).toEqual([
      { status: 'inProgress', page: 1, title: '', description: '', order: 'asc' },
      { status: 'completed', page: 1, title: '', description: '', order: 'asc' },
    ]);
  });

  it('loads page 1 when a hidden column is shown again and ignores its stale response', () => {
    const current = connect();
    settle();
    const stale = lastCall('completed');

    current.set(filters({ statuses: ['pending'] }));
    settle();
    current.set(DEFAULT_BOARD_FILTERS);
    settle();

    stale.response.next({
      items: [task('stale', 'completed')],
      totalCount: 1,
      pageNumber: 1,
    });

    expect(
      api.calls.filter((call) => call.query.status === 'completed').map((call) => call.query.page),
    ).toEqual([1, 1]);
    expect(column('completed')).toMatchObject({ loading: true, items: [] });
  });

  it('drops a slow response that belongs to filters that are no longer current', () => {
    const current = connect(filters({ title: 'antiga' }));
    settle();
    const stale = [...api.calls];

    current.set(filters({ title: 'nova' }));
    settle();

    for (const call of api.calls.slice(stale.length)) {
      call.response.next({
        items: [task(call.query.status, call.query.status)],
        totalCount: 1,
        pageNumber: 1,
      });
    }

    for (const call of stale) {
      call.response.next({
        items: [task('stale', call.query.status)],
        totalCount: 1,
        pageNumber: 1,
      });
    }

    expect(column('pending').items.map((item) => item.id)).toEqual(['pending']);
    expect(column('inProgress').items.map((item) => item.id)).toEqual(['inProgress']);
    expect(column('completed').items.map((item) => item.id)).toEqual(['completed']);
  });

  it('appends the next page and ignores a call while loading or when nothing remains', () => {
    connect();
    settle();

    store.loadNextPage('pending');
    expect(api.calls.filter((call) => call.query.page === 2)).toHaveLength(0);

    lastCall('pending').response.next({
      items: [task('a', 'pending'), task('b', 'pending')],
      totalCount: 3,
      pageNumber: 1,
    });

    store.loadNextPage('pending');
    const pageTwo = lastCall('pending');
    expect(pageTwo.query).toEqual({
      status: 'pending',
      page: 2,
      title: '',
      description: '',
      order: 'asc',
    });
    expect(column('pending')).toMatchObject({ loading: false, loadingMore: true });

    store.loadNextPage('pending');
    expect(
      api.calls.filter((call) => call.query.status === 'pending' && call.query.page === 2),
    ).toHaveLength(1);

    pageTwo.response.next({
      items: [task('c', 'pending')],
      totalCount: 3,
      pageNumber: 2,
    });

    expect(column('pending').items.map((item) => item.id)).toEqual(['a', 'b', 'c']);
    expect(column('pending')).toMatchObject({
      loadedPages: 2,
      loadingMore: false,
      hasMore: false,
    });

    store.loadNextPage('pending');
    expect(api.calls.filter((call) => call.query.status === 'pending')).toHaveLength(2);
  });

  it('drops a duplicated id when appending the next page', () => {
    connect();
    settle();
    lastCall('pending').response.next({
      items: [task('a', 'pending'), task('b', 'pending')],
      totalCount: 3,
      pageNumber: 1,
    });

    store.loadNextPage('pending');
    lastCall('pending').response.next({
      items: [task('b', 'pending'), task('c', 'pending')],
      totalCount: 3,
      pageNumber: 2,
    });

    expect(column('pending').items.map((item) => item.id)).toEqual(['a', 'b', 'c']);
  });

  it('records an error on the failed column and retries that column from page 1', () => {
    connect();
    settle();

    lastCall('pending').response.error(new Error('falhou'));
    lastCall('inProgress').response.next({
      items: [task('b', 'inProgress')],
      totalCount: 1,
      pageNumber: 1,
    });

    expect(column('pending')).toMatchObject({ error: true, loading: false, items: [] });
    expect(column('inProgress').items.map((item) => item.id)).toEqual(['b']);

    store.retry('pending');

    expect(column('pending')).toMatchObject({ error: false, loading: true, items: [] });
    const retried = lastCall('pending');
    expect(retried.query.page).toBe(1);

    retried.response.next({
      items: [task('a', 'pending')],
      totalCount: 1,
      pageNumber: 1,
    });

    expect(column('pending').items.map((item) => item.id)).toEqual(['a']);
    expect(column('pending')).toMatchObject({ error: false, loading: false, hasMore: false });
  });
});
