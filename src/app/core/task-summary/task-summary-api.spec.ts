import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../api/api-base-url';
import { TaskSummaryApi, type TaskSummary } from './task-summary-api';

describe('TaskSummaryApi', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  describe('with the development base URL', () => {
    let api: TaskSummaryApi;
    let httpMock: HttpTestingController;

    beforeEach(() => {
      ({ api, httpMock } = setup(''));
    });

    it('gets /api/tasks/summary and maps the counts', () => {
      let result: TaskSummary | undefined;

      api.getSummary().subscribe((value) => {
        result = value;
      });

      const request = httpMock.expectOne('/api/tasks/summary');
      expect(request.request.method).toBe('GET');

      request.flush({ pending: 2, inProgress: 1, completed: 4, total: 7 });

      expect(result).toEqual({ pending: 2, inProgress: 1, completed: 4, total: 7 });
    });

    it('keeps zeros for a user with no tasks', () => {
      let result: TaskSummary | undefined;

      api.getSummary().subscribe((value) => {
        result = value;
      });

      httpMock
        .expectOne('/api/tasks/summary')
        .flush({ pending: 0, inProgress: 0, completed: 0, total: 0 });

      expect(result).toEqual({ pending: 0, inProgress: 0, completed: 0, total: 0 });
    });

    it('rejects a summary missing a count', () => {
      let error: unknown;

      api.getSummary().subscribe({
        error: (value: unknown) => {
          error = value;
        },
      });

      httpMock.expectOne('/api/tasks/summary').flush({ pending: 0, inProgress: 0, completed: 0 });

      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('total');
    });
  });

  describe('with a production base URL', () => {
    let api: TaskSummaryApi;
    let httpMock: HttpTestingController;

    beforeEach(() => {
      ({ api, httpMock } = setup('https://api.taskflow.example'));
    });

    it('prefixes the summary path with API_BASE_URL', () => {
      api.getSummary().subscribe();

      httpMock.expectOne('https://api.taskflow.example/api/tasks/summary').flush({
        pending: 0,
        inProgress: 0,
        completed: 0,
        total: 0,
      });
    });
  });
});

function setup(apiBaseUrl: string): { api: TaskSummaryApi; httpMock: HttpTestingController } {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_BASE_URL, useValue: apiBaseUrl },
    ],
  });

  return {
    api: TestBed.inject(TaskSummaryApi),
    httpMock: TestBed.inject(HttpTestingController),
  };
}
