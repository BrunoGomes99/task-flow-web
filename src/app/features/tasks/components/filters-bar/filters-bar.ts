import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { LucideSlidersHorizontal, LucideX } from '@lucide/angular';

import {
  MultiSelect,
  type MultiSelectOption,
} from '../../../../shared/ui/multi-select/multi-select';
import type { BoardFilters } from '../../models/board-filters';
import { TASK_STATUSES, TASK_STATUS_LABELS } from '../../models/task';

let nextFiltersBarId = 0;

@Component({
  selector: 'app-filters-bar',
  imports: [LucideSlidersHorizontal, LucideX, MultiSelect],
  templateUrl: './filters-bar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block border-b border-border px-4 py-3 md:px-6',
  },
})
export class FiltersBar {
  readonly filters = input.required<BoardFilters>();
  readonly filtersChange = output<BoardFilters>();

  protected readonly statusOptions: readonly MultiSelectOption[] = TASK_STATUSES.map((status) => ({
    value: status,
    label: TASK_STATUS_LABELS[status],
  }));
  protected readonly panelId = `board-filters-${nextFiltersBarId++}`;
  protected readonly filtersOpen = signal(false);
  protected readonly titleText = signal('');
  protected readonly descriptionText = signal('');

  private readonly draft = signal<BoardFilters | null>(null);

  protected readonly viewFilters = computed(() => this.draft() ?? this.filters());
  protected readonly panelClass = computed(() => {
    const layout = 'mt-3 flex-col gap-3 md:mt-0 md:flex md:flex-row md:flex-wrap md:items-center';
    return this.filtersOpen() ? `flex ${layout}` : `hidden ${layout}`;
  });

  constructor() {
    effect(() => {
      const incoming = this.filters();
      const draft = untracked(() => this.draft());
      if (draft === null) {
        this.titleText.set(incoming.title);
        this.descriptionText.set(incoming.description);
        this.draft.set(copyFilters(incoming));
        return;
      }

      if (sameFilters(incoming, draft)) {
        return;
      }

      // The URL trims the text and sends it back. Skip the rewrite when the
      // trimmed field already matches, so the caret stays where the user left it.
      const title = untracked(() => this.titleText());
      if (incoming.title !== title.trim()) {
        this.titleText.set(incoming.title);
      }

      const description = untracked(() => this.descriptionText());
      if (incoming.description !== description.trim()) {
        this.descriptionText.set(incoming.description);
      }

      this.draft.set({
        ...copyFilters(incoming),
        title: untracked(() => this.titleText()).trim(),
        description: untracked(() => this.descriptionText()).trim(),
      });
    });
  }

  protected toggleFilters(): void {
    this.filtersOpen.update((open) => !open);
  }

  protected onTitleInput(event: Event): void {
    const value = readControlValue(event, HTMLInputElement);
    if (value === null) {
      return;
    }

    this.titleText.set(value);
    this.publish({ title: value.trim() });
  }

  protected onDescriptionInput(event: Event): void {
    const value = readControlValue(event, HTMLInputElement);
    if (value === null) {
      return;
    }

    this.descriptionText.set(value);
    this.publish({ description: value.trim() });
  }

  protected clearTitle(): void {
    this.titleText.set('');
    this.publish({ title: '' });
  }

  protected clearDescription(): void {
    this.descriptionText.set('');
    this.publish({ description: '' });
  }

  protected onStatusesChange(values: readonly string[]): void {
    const statuses = TASK_STATUSES.filter((status) => values.includes(status));
    if (statuses.length === 0) {
      return;
    }

    this.publish({ statuses });
  }

  protected onOrderChange(event: Event): void {
    const value = readControlValue(event, HTMLSelectElement);
    if (value === null) {
      return;
    }

    this.publish({ order: value === 'desc' ? 'desc' : 'asc' });
  }

  private publish(patch: Partial<BoardFilters>): void {
    const next: BoardFilters = { ...(this.draft() ?? copyFilters(this.filters())), ...patch };
    this.draft.set(next);
    this.filtersChange.emit(next);
  }
}

function readControlValue(
  event: Event,
  control: typeof HTMLInputElement | typeof HTMLSelectElement,
): string | null {
  const target = event.target;
  return target instanceof control ? target.value : null;
}

function copyFilters(filters: BoardFilters): BoardFilters {
  return {
    title: filters.title,
    description: filters.description,
    statuses: [...filters.statuses],
    order: filters.order,
  };
}

function sameFilters(left: BoardFilters, right: BoardFilters): boolean {
  return (
    left.title === right.title &&
    left.description === right.description &&
    left.order === right.order &&
    left.statuses.length === right.statuses.length &&
    left.statuses.every((status, index) => status === right.statuses[index])
  );
}
