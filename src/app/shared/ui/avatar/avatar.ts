import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-avatar',
  templateUrl: './avatar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white',
    'aria-hidden': 'true',
  },
})
export class Avatar {
  readonly initials = input.required<string>();
}
