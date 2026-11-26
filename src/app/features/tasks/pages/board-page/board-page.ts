import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { BoardColumn } from '../../components/board-column/board-column';
import { FiltersBar } from '../../components/filters-bar/filters-bar';
import { parseBoardFilters, toBoardQueryParams } from '../../data-access/board-query-params';
import { BoardStore } from '../../data-access/board-store';
import type { BoardFilters } from '../../models/board-filters';
import type { TaskStatus } from '../../models/task';

@Component({
  selector: 'app-board-page',
  imports: [BoardColumn, FiltersBar],
  templateUrl: './board-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex min-h-0 flex-1 flex-col overflow-hidden',
  },
})
export class BoardPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(BoardStore);

  private readonly queryParamMap = toSignal(this.route.queryParamMap, { requireSync: true });

  protected readonly filters = computed(() => parseBoardFilters(this.queryParamMap()).filters);
  protected readonly columns = this.store.columns;
  protected readonly now = new Date();

  constructor() {
    this.store.connect(this.filters);

    effect(() => {
      const parsed = parseBoardFilters(this.queryParamMap());
      if (!parsed.needsNormalization) {
        return;
      }

      const queryParams = toBoardQueryParams(parsed.filters);
      untracked(() => {
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams,
          replaceUrl: true,
        });
      });
    });
  }

  protected onFiltersChange(next: BoardFilters): void {
    const current = this.filters();
    const textChanged = next.title !== current.title || next.description !== current.description;

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: toBoardQueryParams(next),
      replaceUrl: textChanged,
    });
  }

  protected loadMore(status: TaskStatus): void {
    this.store.loadNextPage(status);
  }

  protected retry(status: TaskStatus): void {
    this.store.retry(status);
  }
}
