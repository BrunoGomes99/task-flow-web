import { TestBed } from '@angular/core/testing';

import { type Toast, ToastStore } from './toast-store';

describe('ToastStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  function store(): ToastStore {
    return TestBed.inject(ToastStore);
  }

  it('shows a success toast and removes it after 4 seconds', () => {
    const toastStore = store();

    toastStore.success('Tarefa criada com sucesso.');

    expect(messages(toastStore)).toEqual([
      { kind: 'success', message: 'Tarefa criada com sucesso.' },
    ]);

    vi.advanceTimersByTime(3_999);
    expect(toastStore.toasts()).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(toastStore.toasts()).toHaveLength(0);
  });

  it('shows an error toast and removes it after 8 seconds', () => {
    const toastStore = store();

    toastStore.error('Ocorreu um erro inesperado. Tente novamente.');

    expect(messages(toastStore)).toEqual([
      { kind: 'error', message: 'Ocorreu um erro inesperado. Tente novamente.' },
    ]);

    vi.advanceTimersByTime(4_000);
    expect(toastStore.toasts()).toHaveLength(1);

    vi.advanceTimersByTime(4_000);
    expect(toastStore.toasts()).toHaveLength(0);
  });

  it('keeps at most 3 toasts and drops the oldest first', () => {
    const toastStore = store();

    toastStore.success('um');
    toastStore.error('dois');
    toastStore.success('três');
    toastStore.error('quatro');

    expect(messages(toastStore)).toEqual([
      { kind: 'error', message: 'dois' },
      { kind: 'success', message: 'três' },
      { kind: 'error', message: 'quatro' },
    ]);
  });

  it('dismisses a toast immediately and does not remove another when its timer elapses', () => {
    const toastStore = store();

    toastStore.success('primeira');
    vi.advanceTimersByTime(1_000);
    toastStore.success('segunda');

    const first = toastStore.toasts()[0];
    if (first === undefined) {
      throw new Error('Expected the first toast.');
    }

    toastStore.dismiss(first.id);
    expect(messages(toastStore)).toEqual([{ kind: 'success', message: 'segunda' }]);

    vi.advanceTimersByTime(3_000);
    expect(messages(toastStore)).toEqual([{ kind: 'success', message: 'segunda' }]);

    vi.advanceTimersByTime(1_000);
    expect(toastStore.toasts()).toHaveLength(0);
  });
});

function messages(toastStore: ToastStore): Pick<Toast, 'kind' | 'message'>[] {
  return toastStore.toasts().map((toast) => ({ kind: toast.kind, message: toast.message }));
}
