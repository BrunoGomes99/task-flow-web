import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LucideCircleExclamationPoint, LucideInfo } from '@lucide/angular';

export type AlertVariant = 'info' | 'danger';

@Component({
  selector: 'app-alert',
  imports: [LucideCircleExclamationPoint, LucideInfo],
  templateUrl: './alert.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex items-start gap-2 rounded-lg border bg-surface px-3 py-2 text-sm',
    '[attr.role]': 'liveRole()',
    '[class.border-danger]': 'variant() === "danger"',
    '[class.text-danger]': 'variant() === "danger"',
    '[class.border-border]': 'variant() === "info"',
    '[class.text-text]': 'variant() === "info"',
  },
})
export class Alert {
  readonly variant = input<AlertVariant>('info');

  protected readonly liveRole = computed(() => (this.variant() === 'danger' ? 'alert' : 'status'));
}
