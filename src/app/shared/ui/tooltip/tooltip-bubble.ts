import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-tooltip-bubble',
  templateUrl: './tooltip-bubble.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'pointer-events-none block',
    role: 'tooltip',
    '[id]': 'tooltipId()',
  },
})
export class TooltipBubble {
  readonly message = input.required<string>();
  readonly tooltipId = input.required<string>();
}
