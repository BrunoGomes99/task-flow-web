import type { ParamMap } from '@angular/router';

import type { BoardFilters } from '../models/board-filters';
import { TASK_STATUSES, type TaskStatus } from '../models/task';

export interface ParsedBoardFilters {
  readonly filters: BoardFilters;
  readonly needsNormalization: boolean;
}

export interface BoardQueryParams {
  readonly title?: string;
  readonly description?: string;
  readonly status?: string;
  readonly order?: 'desc';
}

export function parseBoardFilters(params: ParamMap): ParsedBoardFilters {
  const filters: BoardFilters = {
    title: readText(params, 'title'),
    description: readText(params, 'description'),
    statuses: readStatuses(params),
    order: readOrder(params),
  };

  return {
    filters,
    needsNormalization: !isCanonical(params, toBoardQueryParams(filters)),
  };
}

export function toBoardQueryParams(filters: BoardFilters): BoardQueryParams {
  const query: {
    title?: string;
    description?: string;
    status?: string;
    order?: 'desc';
  } = {};

  if (filters.title.length > 0) {
    query.title = filters.title;
  }

  if (filters.description.length > 0) {
    query.description = filters.description;
  }

  const statuses = TASK_STATUSES.filter((status) => filters.statuses.includes(status));
  if (statuses.length > 0 && statuses.length < TASK_STATUSES.length) {
    query.status = statuses.join(',');
  }

  if (filters.order === 'desc') {
    query.order = 'desc';
  }

  return query;
}

function readText(params: ParamMap, key: string): string {
  return (params.get(key) ?? '').trim();
}

function readStatuses(params: ParamMap): readonly TaskStatus[] {
  const raw = params.get('status');
  if (raw === null) {
    return TASK_STATUSES;
  }

  const seen = new Set<TaskStatus>();
  for (const token of raw.split(',')) {
    const status = token.trim();
    if (isTaskStatus(status)) {
      seen.add(status);
    }
  }

  if (seen.size === 0) {
    return TASK_STATUSES;
  }

  return TASK_STATUSES.filter((status) => seen.has(status));
}

function readOrder(params: ParamMap): BoardFilters['order'] {
  return params.get('order') === 'desc' ? 'desc' : 'asc';
}

function isTaskStatus(value: string): value is TaskStatus {
  return value === 'pending' || value === 'inProgress' || value === 'completed';
}

function isCanonical(params: ParamMap, canonical: BoardQueryParams): boolean {
  return (
    matches(params, 'title', canonical.title) &&
    matches(params, 'description', canonical.description) &&
    matches(params, 'status', canonical.status) &&
    matches(params, 'order', canonical.order)
  );
}

function matches(params: ParamMap, key: string, expected: string | undefined): boolean {
  const actual = params.get(key);
  return expected === undefined ? actual === null : actual === expected;
}
