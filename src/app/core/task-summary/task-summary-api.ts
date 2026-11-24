import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';

import { API_BASE_URL } from '../api/api-base-url';
import type { TaskSummaryDto } from '../api/api-models';

export interface TaskSummary {
  pending: number;
  inProgress: number;
  completed: number;
  total: number;
}

@Injectable({ providedIn: 'root' })
export class TaskSummaryApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  getSummary(): Observable<TaskSummary> {
    return this.http.get<TaskSummaryDto>(this.url('/api/tasks/summary')).pipe(map(toTaskSummary));
  }

  private url(path: string): string {
    return `${this.baseUrl}${path}`;
  }
}

function toTaskSummary(dto: TaskSummaryDto): TaskSummary {
  return {
    pending: requiredCount(dto.pending, 'pending'),
    inProgress: requiredCount(dto.inProgress, 'inProgress'),
    completed: requiredCount(dto.completed, 'completed'),
    total: requiredCount(dto.total, 'total'),
  };
}

function requiredCount(value: number | undefined, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Summary response is missing ${field}.`);
  }

  return value;
}
