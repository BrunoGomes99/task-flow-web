import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';

export type ToastKind = 'success' | 'error';

export interface Toast {
  readonly id: string;
  readonly kind: ToastKind;
  readonly message: string;
}

const MAX_VISIBLE = 3;
const SUCCESS_DURATION_MS = 4_000;
const ERROR_DURATION_MS = 8_000;

@Injectable({ providedIn: 'root' })
export class ToastStore {
  private readonly state = signal<readonly Toast[]>([]);
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private nextId = 0;

  readonly toasts = computed(() => this.state());

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      for (const timer of this.timers.values()) {
        clearTimeout(timer);
      }
      this.timers.clear();
    });
  }

  success(message: string): void {
    this.show('success', message, SUCCESS_DURATION_MS);
  }

  error(message: string): void {
    this.show('error', message, ERROR_DURATION_MS);
  }

  dismiss(id: string): void {
    this.clearTimer(id);
    this.state.update((current) =>
      current.some((toast) => toast.id === id)
        ? current.filter((toast) => toast.id !== id)
        : current,
    );
  }

  private show(kind: ToastKind, message: string, durationMs: number): void {
    const toast: Toast = { id: `${++this.nextId}`, kind, message };
    const current = this.state();
    const next = [...current, toast];
    const overflow = Math.max(0, next.length - MAX_VISIBLE);

    for (const removed of next.slice(0, overflow)) {
      this.clearTimer(removed.id);
    }

    this.state.set(next.slice(overflow));
    this.timers.set(
      toast.id,
      setTimeout(() => {
        this.timers.delete(toast.id);
        this.dismiss(toast.id);
      }, durationMs),
    );
  }

  private clearTimer(id: string): void {
    const timer = this.timers.get(id);
    if (timer === undefined) {
      return;
    }

    clearTimeout(timer);
    this.timers.delete(id);
  }
}
