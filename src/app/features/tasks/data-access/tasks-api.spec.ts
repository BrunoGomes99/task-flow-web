import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  type TestRequest,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '@core/api/api-base-url';

import { TasksApi, type TaskListQuery, type TaskPage } from './tasks-api';

describe('TasksApi', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  describe('with the development base URL', () => {
    let api: TasksApi;
    let httpMock: HttpTestingController;

    beforeEach(() => {
      ({ api, httpMock } = setup(''));
    });

    it('requests one page of one status with pageSize 20', () => {
      let result: TaskPage | undefined;

      api
        .list({ status: 'inProgress', page: 2, title: '', description: '', order: 'asc' })
        .subscribe((value) => {
          result = value;
        });

      const request = expectList(httpMock);
      expect(request.request.params.get('pageNumber')).toBe('2');
      expect(request.request.params.get('status')).toBe('inProgress');
      expect(request.request.params.get('dueDateOrder')).toBe('ascending');
      expect(request.request.params.keys()).toEqual([
        'pageNumber',
        'pageSize',
        'status',
        'dueDateOrder',
      ]);

      request.flush({
        items: [
          {
            id: 'task-1',
            title: 'Pagar boleto',
            description: null,
            status: 'inProgress',
            dueDate: '2026-11-21T02:59:59.000Z',
            createdAt: '2026-11-18T12:00:00.000Z',
            updatedAt: '2026-11-19T12:00:00.000Z',
          },
        ],
        pageNumber: 2,
        pageSize: 20,
        totalCount: 21,
      });

      expect(result).toEqual({
        items: [
          {
            id: 'task-1',
            title: 'Pagar boleto',
            description: '',
            status: 'inProgress',
            dueAt: new Date('2026-11-21T02:59:59.000Z'),
            createdAt: new Date('2026-11-18T12:00:00.000Z'),
            updatedAt: new Date('2026-11-19T12:00:00.000Z'),
          },
        ],
        totalCount: 21,
        pageNumber: 2,
      });
    });

    it('omits empty text filters and sends descending order', () => {
      api.list(query({ title: 'pagar', description: '', order: 'desc' })).subscribe();

      const request = expectList(httpMock);
      expect(request.request.params.get('titleContains')).toBe('pagar');
      expect(request.request.params.has('descriptionContains')).toBe(false);
      expect(request.request.params.get('dueDateOrder')).toBe('descending');

      request.flush(emptyPage());
    });

    it('sends descriptionContains when the title filter is empty', () => {
      api.list(query({ title: '', description: 'boleto', status: 'completed' })).subscribe();

      const request = expectList(httpMock);
      expect(request.request.params.has('titleContains')).toBe(false);
      expect(request.request.params.get('descriptionContains')).toBe('boleto');
      expect(request.request.params.get('status')).toBe('completed');

      request.flush(emptyPage());
    });

    it('sends both text filters when both have text', () => {
      api.list(query({ title: 'pagar', description: 'boleto' })).subscribe();

      const request = expectList(httpMock);
      expect(request.request.params.get('titleContains')).toBe('pagar');
      expect(request.request.params.get('descriptionContains')).toBe('boleto');

      request.flush(emptyPage());
    });
  });

  describe('with a production base URL', () => {
    let api: TasksApi;
    let httpMock: HttpTestingController;

    beforeEach(() => {
      ({ api, httpMock } = setup('https://api.taskflow.example'));
    });

    it('prefixes the tasks path with API_BASE_URL', () => {
      api.list(query()).subscribe();

      const request = httpMock.expectOne(
        (req) => req.method === 'GET' && req.url === 'https://api.taskflow.example/api/tasks',
      );
      expect(request.request.params.get('pageSize')).toBe('20');

      request.flush(emptyPage());
    });
  });
});

function query(overrides: Partial<TaskListQuery> = {}): TaskListQuery {
  return {
    status: 'pending',
    page: 1,
    title: '',
    description: '',
    order: 'asc',
    ...overrides,
  };
}

function emptyPage() {
  return { items: [], pageNumber: 1, pageSize: 20, totalCount: 0 };
}

function expectList(httpMock: HttpTestingController): TestRequest {
  const request = httpMock.expectOne((req) => req.method === 'GET' && req.url === '/api/tasks');
  expect(request.request.params.get('pageSize')).toBe('20');
  return request;
}

function setup(apiBaseUrl: string): { api: TasksApi; httpMock: HttpTestingController } {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_BASE_URL, useValue: apiBaseUrl },
    ],
  });

  return {
    api: TestBed.inject(TasksApi),
    httpMock: TestBed.inject(HttpTestingController),
  };
}
