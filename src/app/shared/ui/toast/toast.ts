import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LucideCircleCheck, LucideCircleExclamationPoint, LucideX } from '@lucide/angular';

export type ToastVariant = 'success' | 'error';

@Component({
  selector: 'app-toast',
  imports: [LucideCircleCheck, LucideCircleExclamationPoint, LucideX],
  templateUrl: './toast.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'pointer-events-auto flex w-full items-start gap-3 rounded-xl border bg-surface px-4 py-3 shadow-lg',
    '[class.border-danger]': 'kind() === "error"',
    '[class.text-danger]': 'kind() === "error"',
    '[class.border-border]': 'kind() === "success"',
    '[class.text-text]': 'kind() === "success"',
  },
})
export class Toast {
  readonly kind = input.required<ToastVariant>();
  readonly message = input.required<string>();
  readonly dismissed = output<void>();

  protected close(): void {
    this.dismissed.emit();
  }
}
