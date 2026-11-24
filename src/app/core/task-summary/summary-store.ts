import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, map, of, switchMap } from 'rxjs';

import { TaskSummaryApi, type TaskSummary } from './task-summary-api';

interface SummaryState {
  summary: TaskSummary | null;
  loading: boolean;
  error: boolean;
}

@Injectable({ providedIn: 'root' })
export class SummaryStore {
  private readonly api = inject(TaskSummaryApi);
  private readonly requests = new Subject<void>();

  private readonly state = signal<SummaryState>({
    summary: null,
    loading: false,
    error: false,
  });

  readonly summary = computed(() => this.state().summary);
  readonly loading = computed(() => this.state().loading);
  readonly error = computed(() => this.state().error);

  constructor() {
    this.requests
      .pipe(
        switchMap(() =>
          this.api.getSummary().pipe(
            map((summary) => ({ failed: false as const, summary })),
            catchError(() => of({ failed: true as const })),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        if (result.failed) {
          this.state.update((current) => ({
            summary: current.summary,
            loading: false,
            error: true,
          }));
          return;
        }

        this.state.set({ summary: result.summary, loading: false, error: false });
      });
  }

  load(): void {
    this.state.set({ summary: null, loading: true, error: false });
    this.requests.next();
  }

  refresh(): void {
    this.state.update((current) => ({ ...current, loading: true, error: false }));
    this.requests.next();
  }
}
