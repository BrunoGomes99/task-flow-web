import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type BadgeVariant = 'neutral' | 'status' | 'danger';

@Component({
  selector: 'app-badge',
  templateUrl: './badge.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold',
    '[class.border-border]': 'variant() !== "danger"',
    '[class.bg-background]': 'variant() === "neutral"',
    '[class.text-secondary-text]': 'variant() === "neutral"',
    '[class.bg-surface]': 'variant() !== "neutral"',
    '[class.text-text]': 'variant() === "status"',
    '[class.border-danger]': 'variant() === "danger"',
    '[class.text-danger]': 'variant() === "danger"',
  },
})
export class Badge {
  readonly variant = input<BadgeVariant>('neutral');
}
