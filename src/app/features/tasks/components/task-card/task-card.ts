import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LucideCalendar, LucideCircleExclamationPoint, LucideLock } from '@lucide/angular';

import { Badge, type BadgeVariant } from '../../../../shared/ui/badge/badge';
import { formatDateBr, isOverdue } from '../../../../shared/utils/date';
import type { Task } from '../../models/task';

@Component({
  selector: 'app-task-card',
  imports: [Badge, LucideCalendar, LucideCircleExclamationPoint, LucideLock],
  templateUrl: './task-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block',
  },
})
export class TaskCard {
  readonly task = input.required<Task>();
  readonly now = input.required<Date>();

  protected readonly locked = computed(() => this.task().status === 'completed');

  protected readonly description = computed(() => {
    const value = this.task().description;
    return value.trim().length > 0 ? value : null;
  });

  protected readonly overdue = computed(() => {
    const dueAt = this.task().dueAt;
    return !this.locked() && dueAt !== null && isOverdue(dueAt, this.now());
  });

  protected readonly dueLabel = computed(() => {
    const dueAt = this.task().dueAt;
    if (dueAt === null) {
      return 'Sem prazo';
    }

    const formatted = formatDateBr(dueAt);
    return this.overdue() ? `${formatted} (Atrasada)` : formatted;
  });

  protected readonly dueVariant = computed<BadgeVariant>(() => {
    if (this.overdue()) {
      return 'danger';
    }

    return this.task().dueAt === null ? 'neutral' : 'status';
  });
}
