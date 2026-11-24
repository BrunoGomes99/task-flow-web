import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { Toast } from '@shared/ui/toast/toast';

import { ToastStore } from '../toast-store';

@Component({
  selector: 'app-toast-outlet',
  imports: [Toast],
  templateUrl: './toast-outlet.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'pointer-events-none fixed inset-x-4 top-4 z-50 flex justify-end',
  },
})
export class ToastOutlet {
  private readonly toastStore = inject(ToastStore);

  protected readonly toasts = this.toastStore.toasts;

  protected dismiss(id: string): void {
    this.toastStore.dismiss(id);
  }
}
