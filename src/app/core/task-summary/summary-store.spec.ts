import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../api/api-base-url';
import { SummaryStore } from './summary-store';
import type { TaskSummary } from './task-summary-api';

const populated: TaskSummary = { pending: 2, inProgress: 1, completed: 4, total: 7 };
const zeros: TaskSummary = { pending: 0, inProgress: 0, completed: 0, total: 0 };

describe('SummaryStore', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '' },
      ],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    TestBed.resetTestingModule();
  });

  it('load clears the current numbers, then stores the response', () => {
    const store = TestBed.inject(SummaryStore);
    const http = TestBed.inject(HttpTestingController);

    store.load();
    http.expectOne('/api/tasks/summary').flush(populated);

    store.load();

    expect(store.summary()).toBeNull();
    expect(store.loading()).toBe(true);
    expect(store.error()).toBe(false);

    http.expectOne('/api/tasks/summary').flush(zeros);

    expect(store.summary()).toEqual(zeros);
    expect(store.loading()).toBe(false);
    expect(store.error()).toBe(false);
  });

  it('refresh reloads without clearing the current numbers', () => {
    const store = TestBed.inject(SummaryStore);
    const http = TestBed.inject(HttpTestingController);

    store.load();
    http.expectOne('/api/tasks/summary').flush(populated);

    store.refresh();

    expect(store.summary()).toEqual(populated);
    expect(store.loading()).toBe(true);
    expect(store.error()).toBe(false);

    http.expectOne('/api/tasks/summary').flush(zeros);

    expect(store.summary()).toEqual(zeros);
    expect(store.loading()).toBe(false);
  });

  it('records an error and drops the numbers when load fails', () => {
    const store = TestBed.inject(SummaryStore);
    const http = TestBed.inject(HttpTestingController);

    store.load();
    http.expectOne('/api/tasks/summary').flush(populated);

    store.load();
    http.expectOne('/api/tasks/summary').flush(null, { status: 500, statusText: 'Server Error' });

    expect(store.summary()).toBeNull();
    expect(store.loading()).toBe(false);
    expect(store.error()).toBe(true);
  });

  it('keeps the current numbers when refresh fails', () => {
    const store = TestBed.inject(SummaryStore);
    const http = TestBed.inject(HttpTestingController);

    store.load();
    http.expectOne('/api/tasks/summary').flush(populated);

    store.refresh();
    http.expectOne('/api/tasks/summary').flush(null, { status: 500, statusText: 'Server Error' });

    expect(store.summary()).toEqual(populated);
    expect(store.loading()).toBe(false);
    expect(store.error()).toBe(true);
  });
});
