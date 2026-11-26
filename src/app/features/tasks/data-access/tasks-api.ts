import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';

import { API_BASE_URL } from '@core/api/api-base-url';
import type { PagedTaskDto } from '@core/api/api-models';

import type { TaskStatus } from '../models/task';
import { toTaskPage, type TaskPage } from './task-mappers';

export type { TaskPage };

// The API rejects pageSize above 20.
const PAGE_SIZE = 20;

export interface TaskListQuery {
  readonly status: TaskStatus;
  readonly page: number;
  readonly title: string;
  readonly description: string;
  readonly order: 'asc' | 'desc';
}

@Injectable({ providedIn: 'root' })
export class TasksApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  // One column per request. The visible-column filter only decides which calls run (ADR 0003).
  list(query: TaskListQuery): Observable<TaskPage> {
    let params = new HttpParams()
      .set('pageNumber', query.page)
      .set('pageSize', PAGE_SIZE)
      .set('status', query.status)
      .set('dueDateOrder', toDueDateOrder(query.order));

    if (query.title.length > 0) {
      params = params.set('titleContains', query.title);
    }

    if (query.description.length > 0) {
      params = params.set('descriptionContains', query.description);
    }

    return this.http.get<PagedTaskDto>(this.url('/api/tasks'), { params }).pipe(map(toTaskPage));
  }

  private url(path: string): string {
    return `${this.baseUrl}${path}`;
  }
}

function toDueDateOrder(order: TaskListQuery['order']): 'ascending' | 'descending' {
  return order === 'asc' ? 'ascending' : 'descending';
}
