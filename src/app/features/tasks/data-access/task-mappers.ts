import type { PagedTaskDto, TaskDto } from '@core/api/api-models';

import type { Task, TaskStatus } from '../models/task';

export interface TaskPage {
  readonly items: readonly Task[];
  readonly totalCount: number;
  readonly pageNumber: number;
}

export function toTask(dto: TaskDto): Task {
  return {
    id: requiredText(dto.id, 'id'),
    title: requiredText(dto.title, 'title'),
    description: dto.description ?? '',
    status: requiredStatus(dto.status),
    dueAt: optionalInstant(dto.dueDate),
    createdAt: requiredInstant(dto.createdAt, 'createdAt'),
    updatedAt: requiredInstant(dto.updatedAt, 'updatedAt'),
  };
}

export function toTaskPage(dto: PagedTaskDto): TaskPage {
  if (dto.items === null || dto.items === undefined) {
    throw new Error('Task response is missing items.');
  }

  return {
    items: dto.items.map(toTask),
    totalCount: requiredCount(dto.totalCount, 'totalCount'),
    pageNumber: requiredCount(dto.pageNumber, 'pageNumber'),
  };
}

function requiredStatus(value: TaskDto['status']): TaskStatus {
  if (value === 'pending' || value === 'inProgress' || value === 'completed') {
    return value;
  }

  throw new Error('Task response has an invalid status.');
}

function optionalInstant(value: string | null | undefined): Date | null {
  if (value === null || value === undefined) {
    return null;
  }

  return parseInstant(value, 'dueDate');
}

function requiredInstant(value: string | undefined, field: string): Date {
  if (value === undefined || value.length === 0) {
    throw new Error(`Task response is missing ${field}.`);
  }

  return parseInstant(value, field);
}

function parseInstant(value: string, field: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Task response has an invalid ${field}.`);
  }

  return date;
}

function requiredText(value: string | null | undefined, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Task response is missing ${field}.`);
  }

  return value;
}

function requiredCount(value: number | undefined, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Task response is missing ${field}.`);
  }

  return value;
}
