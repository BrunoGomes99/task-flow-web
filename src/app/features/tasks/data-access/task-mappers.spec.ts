import type { PagedTaskDto, TaskDto } from '@core/api/api-models';

import { toTask, toTaskPage } from './task-mappers';

const createdAt = '2026-11-18T12:00:00.000Z';
const updatedAt = '2026-11-19T08:30:00.000Z';
const dueAt = '2026-11-21T02:59:59.000Z';

function taskDto(overrides: TaskDto = {}): TaskDto {
  return {
    id: 'task-1',
    title: 'Pagar boleto',
    description: 'Conta de luz',
    status: 'pending',
    dueDate: dueAt,
    createdAt,
    updatedAt,
    ...overrides,
  };
}

describe('toTask', () => {
  it('maps ISO instants to Date and keeps the description', () => {
    expect(toTask(taskDto())).toEqual({
      id: 'task-1',
      title: 'Pagar boleto',
      description: 'Conta de luz',
      status: 'pending',
      dueAt: new Date(dueAt),
      createdAt: new Date(createdAt),
      updatedAt: new Date(updatedAt),
    });
  });

  it('maps a null description to an empty string and a null due date to null', () => {
    expect(toTask(taskDto({ description: null, dueDate: null }))).toEqual({
      id: 'task-1',
      title: 'Pagar boleto',
      description: '',
      status: 'pending',
      dueAt: null,
      createdAt: new Date(createdAt),
      updatedAt: new Date(updatedAt),
    });
  });

  it('maps a missing description to an empty string', () => {
    expect(toTask(taskDto({ description: undefined })).description).toBe('');
  });

  it('rejects a task missing id, title or an instant', () => {
    expect(() => toTask(taskDto({ id: undefined }))).toThrow(/id/);
    expect(() => toTask(taskDto({ title: null }))).toThrow(/title/);
    expect(() => toTask(taskDto({ createdAt: undefined }))).toThrow(/createdAt/);
    expect(() => toTask(taskDto({ updatedAt: '' }))).toThrow(/updatedAt/);
  });

  it('rejects an invalid instant and an invalid status', () => {
    expect(() => toTask(taskDto({ dueDate: 'ontem' }))).toThrow(/dueDate/);
    expect(() => toTask(taskDto({ status: undefined }))).toThrow(/status/);
  });
});

describe('toTaskPage', () => {
  it('maps the page number, the total and each item', () => {
    const dto: PagedTaskDto = {
      items: [taskDto(), taskDto({ id: 'task-2', status: 'completed', dueDate: null })],
      pageNumber: 2,
      pageSize: 20,
      totalCount: 21,
    };

    const page = toTaskPage(dto);

    expect(page.pageNumber).toBe(2);
    expect(page.totalCount).toBe(21);
    expect(page.items.map((task) => task.id)).toEqual(['task-1', 'task-2']);
    expect(page.items[1]).toMatchObject({ status: 'completed', dueAt: null });
  });

  it('keeps a total of zero', () => {
    expect(toTaskPage({ items: [], pageNumber: 1, pageSize: 20, totalCount: 0 })).toEqual({
      items: [],
      totalCount: 0,
      pageNumber: 1,
    });
  });

  it('rejects a page missing items, pageNumber or totalCount', () => {
    expect(() => toTaskPage({ items: null, pageNumber: 1, totalCount: 0 })).toThrow(/items/);
    expect(() => toTaskPage({ items: [], totalCount: 0 })).toThrow(/pageNumber/);
    expect(() => toTaskPage({ items: [], pageNumber: 1 })).toThrow(/totalCount/);
  });
});
