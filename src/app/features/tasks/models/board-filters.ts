import { TASK_STATUSES, type TaskStatus } from './task';

export interface BoardFilters {
  readonly title: string;
  readonly description: string;
  readonly statuses: readonly TaskStatus[];
  readonly order: 'asc' | 'desc';
}

export const DEFAULT_BOARD_FILTERS: BoardFilters = {
  title: '',
  description: '',
  statuses: TASK_STATUSES,
  order: 'asc',
};
