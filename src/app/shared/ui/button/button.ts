import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

@Component({
  selector: 'app-button',
  templateUrl: './button.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'inline-flex',
  },
})
export class Button {
  readonly variant = input<ButtonVariant>('primary');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly loading = input(false, { transform: booleanAttribute });

  protected readonly isDisabled = computed(() => this.disabled() || this.loading());

  protected readonly buttonClass = computed(() => {
    const variants: Record<ButtonVariant, string> = {
      primary: 'bg-accent text-white hover:opacity-90',
      secondary: 'border border-border bg-surface text-text hover:bg-background',
      danger: 'border border-danger bg-surface text-danger hover:bg-background',
      ghost: 'bg-transparent text-text hover:bg-surface',
    };

    return [
      'inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5',
      'text-sm font-semibold transition-colors',
      'disabled:cursor-not-allowed disabled:opacity-60',
      variants[this.variant()],
    ].join(' ');
  });
}
