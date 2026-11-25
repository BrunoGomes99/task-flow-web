import {
  DestroyRef,
  Injectable,
  Injector,
  computed,
  inject,
  signal,
  type Signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  EMPTY,
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  switchMap,
} from 'rxjs';
import type { Observable } from 'rxjs';

import { DEFAULT_BOARD_FILTERS, type BoardFilters } from '../models/board-filters';
import { TASK_STATUSES, type Task, type TaskStatus } from '../models/task';
import { TasksApi, type TaskPage } from './tasks-api';

const FILTER_DEBOUNCE_MS = 300;

export interface BoardColumn {
  readonly status: TaskStatus;
  readonly items: readonly Task[];
  readonly totalCount: number;
  readonly loadedPages: number;
  readonly loading: boolean;
  readonly loadingMore: boolean;
  readonly error: boolean;
  readonly hasMore: boolean;
}

interface ColumnState {
  readonly items: readonly Task[];
  readonly totalCount: number;
  readonly loadedPages: number;
  readonly loading: boolean;
  readonly loadingMore: boolean;
  readonly error: boolean;
}

interface ColumnLoad {
  readonly status: TaskStatus;
  readonly page: number;
  readonly filters: BoardFilters;
  readonly mode: 'replace' | 'append' | 'cancel';
}

interface ColumnSuccess {
  readonly load: ColumnLoad;
  readonly failed: false;
  readonly page: TaskPage;
}

interface ColumnFailure {
  readonly load: ColumnLoad;
  readonly failed: true;
}

type ColumnResult = ColumnSuccess | ColumnFailure;

@Injectable()
export class BoardStore {
  private readonly tasksApi = inject(TasksApi);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  private readonly state = signal<Record<TaskStatus, ColumnState>>(initialColumns());
  private readonly filtersSource = signal<Signal<BoardFilters> | null>(null);
  private readonly requests = new Map<TaskStatus, Subject<ColumnLoad>>();

  readonly filters = computed(() => this.filtersSource()?.() ?? DEFAULT_BOARD_FILTERS);

  readonly columns = computed<readonly BoardColumn[]>(() => {
    const visible = new Set(this.filters().statuses);
    const columns = this.state();
    return TASK_STATUSES.filter((status) => visible.has(status)).map((status) =>
      toColumn(status, columns[status]),
    );
  });

  constructor() {
    for (const status of TASK_STATUSES) {
      const requests = new Subject<ColumnLoad>();
      this.requests.set(status, requests);
      requests
        .pipe(
          switchMap((load) => this.fetch(load)),
          takeUntilDestroyed(),
        )
        .subscribe((result) => {
          this.apply(result);
        });
    }
  }

  connect(filters: Signal<BoardFilters>): void {
    this.filtersSource.set(filters);
    toObservable(filters, { injector: this.injector })
      .pipe(
        debounceTime(FILTER_DEBOUNCE_MS),
        distinctUntilChanged(sameFilters),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((current) => {
        this.reload(current);
      });
  }

  loadNextPage(status: TaskStatus): void {
    if (!this.isVisible(status)) {
      return;
    }

    const column = this.state()[status];
    if (column.loading || column.loadingMore || column.items.length >= column.totalCount) {
      return;
    }

    this.state.update((current) =>
      withColumn(current, status, { ...current[status], loadingMore: true, error: false }),
    );
    this.request({
      status,
      page: column.loadedPages + 1,
      filters: this.filters(),
      mode: 'append',
    });
  }

  retry(status: TaskStatus): void {
    if (!this.isVisible(status)) {
      return;
    }

    this.resetColumn(status);
    this.request({ status, page: 1, filters: this.filters(), mode: 'replace' });
  }

  private reload(filters: BoardFilters): void {
    const visible = new Set(filters.statuses);
    for (const status of TASK_STATUSES) {
      if (!visible.has(status)) {
        this.request({ status, page: 0, filters, mode: 'cancel' });
        continue;
      }

      this.resetColumn(status);
      this.request({ status, page: 1, filters, mode: 'replace' });
    }
  }

  private request(load: ColumnLoad): void {
    this.requests.get(load.status)?.next(load);
  }

  private fetch(load: ColumnLoad): Observable<ColumnResult> {
    if (load.mode === 'cancel') {
      return EMPTY;
    }

    return this.tasksApi
      .list({
        status: load.status,
        page: load.page,
        title: load.filters.title,
        description: load.filters.description,
        order: load.filters.order,
      })
      .pipe(
        map((page) => ({ load, failed: false as const, page })),
        catchError(() => of({ load, failed: true as const })),
      );
  }

  private apply(result: ColumnResult): void {
    const status = result.load.status;
    if (result.failed) {
      this.state.update((current) =>
        withColumn(current, status, {
          ...current[status],
          loading: false,
          loadingMore: false,
          error: true,
        }),
      );
      return;
    }

    const column =
      result.load.mode === 'append'
        ? {
            items: appendUnique(this.state()[status].items, result.page.items),
            totalCount: result.page.totalCount,
            loadedPages: result.page.pageNumber,
            loading: false,
            loadingMore: false,
            error: false,
          }
        : {
            items: result.page.items,
            totalCount: result.page.totalCount,
            loadedPages: result.page.pageNumber,
            loading: false,
            loadingMore: false,
            error: false,
          };

    this.state.update((current) => withColumn(current, status, column));
  }

  private resetColumn(status: TaskStatus): void {
    this.state.update((current) =>
      withColumn(current, status, {
        items: [],
        totalCount: 0,
        loadedPages: 0,
        loading: true,
        loadingMore: false,
        error: false,
      }),
    );
  }

  private isVisible(status: TaskStatus): boolean {
    return this.filters().statuses.includes(status);
  }
}

function initialColumns(): Record<TaskStatus, ColumnState> {
  return {
    pending: emptyColumn(),
    inProgress: emptyColumn(),
    completed: emptyColumn(),
  };
}

function emptyColumn(): ColumnState {
  return {
    items: [],
    totalCount: 0,
    loadedPages: 0,
    loading: false,
    loadingMore: false,
    error: false,
  };
}

function toColumn(status: TaskStatus, column: ColumnState): BoardColumn {
  return {
    status,
    items: column.items,
    totalCount: column.totalCount,
    loadedPages: column.loadedPages,
    loading: column.loading,
    loadingMore: column.loadingMore,
    error: column.error,
    hasMore: column.items.length < column.totalCount,
  };
}

function withColumn(
  state: Record<TaskStatus, ColumnState>,
  status: TaskStatus,
  column: ColumnState,
): Record<TaskStatus, ColumnState> {
  return { ...state, [status]: column };
}

function appendUnique(current: readonly Task[], incoming: readonly Task[]): readonly Task[] {
  const seen = new Set(current.map((item) => item.id));
  const items = [...current];
  for (const item of incoming) {
    if (seen.has(item.id)) {
      continue;
    }

    seen.add(item.id);
    items.push(item);
  }

  return items;
}

function sameFilters(previous: BoardFilters, next: BoardFilters): boolean {
  return (
    previous.title === next.title &&
    previous.description === next.description &&
    previous.order === next.order &&
    previous.statuses.length === next.statuses.length &&
    previous.statuses.every((status, index) => status === next.statuses[index])
  );
}
