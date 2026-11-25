import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  input,
  output,
} from '@angular/core';
import { LucideInfo } from '@lucide/angular';

import { Alert } from '../../../../shared/ui/alert/alert';
import { Badge } from '../../../../shared/ui/badge/badge';
import { Button } from '../../../../shared/ui/button/button';
import { Tooltip } from '../../../../shared/ui/tooltip/tooltip';
import { TASK_STATUS_LABELS, type Task, type TaskStatus } from '../../models/task';
import { TaskCard } from '../task-card/task-card';

let nextColumnId = 0;

@Component({
  selector: 'app-board-column',
  imports: [Alert, Badge, Button, LucideInfo, TaskCard, Tooltip],
  templateUrl: './board-column.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-background',
  },
})
export class BoardColumn {
  readonly status = input.required<TaskStatus>();
  readonly tasks = input.required<readonly Task[]>();
  readonly count = input.required<number>();
  readonly now = input.required<Date>();
  readonly loading = input(false, { transform: booleanAttribute });
  readonly error = input(false, { transform: booleanAttribute });
  readonly retry = output<void>();

  protected readonly headingId = `board-column-${nextColumnId++}`;
  protected readonly label = computed(() => TASK_STATUS_LABELS[this.status()]);
  protected readonly skeletonRows = [0, 1, 2];
  protected readonly lockedHint =
    'Tarefas concluídas ficam travadas e não podem ser editadas nem movidas.';

  protected retryLoad(): void {
    this.retry.emit();
  }
}
