export type TaskStatus = 'pending' | 'inProgress' | 'completed';

/** Board column order, from left to right. */
export const TASK_STATUSES = [
  'pending',
  'inProgress',
  'completed',
] as const satisfies readonly TaskStatus[];

export const TASK_STATUS_LABELS: Readonly<Record<TaskStatus, string>> = {
  pending: 'Pendente',
  inProgress: 'Em Andamento',
  completed: 'Concluída',
};

export interface Task {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly status: TaskStatus;
  readonly dueAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
