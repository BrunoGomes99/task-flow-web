import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  Directive,
  effect,
  input,
  signal,
} from '@angular/core';
import { LucideCircleExclamationPoint } from '@lucide/angular';

let nextFormFieldId = 0;

@Directive({
  selector: '[appFormFieldControl]',
  host: {
    '[attr.id]': 'id',
    '[attr.aria-describedby]': 'describedBy()',
    '[attr.aria-invalid]': 'invalid()',
    class: 'w-full',
  },
})
export class FormFieldControl {
  private static nextId = 0;

  readonly id = `app-form-field-control-${FormFieldControl.nextId++}`;

  protected readonly describedBy = signal<string | null>(null);
  protected readonly invalid = signal<string | null>(null);

  link(describedBy: string | null, invalid: boolean): void {
    this.describedBy.set(describedBy);
    this.invalid.set(invalid ? 'true' : null);
  }
}

@Component({
  selector: 'app-form-field',
  imports: [LucideCircleExclamationPoint],
  templateUrl: './form-field.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-col gap-1.5',
  },
})
export class FormField {
  readonly label = input.required<string>();
  readonly hint = input<string | null>(null);
  readonly errors = input<readonly string[]>([]);

  private readonly control = contentChild(FormFieldControl);
  private readonly fieldId = nextFormFieldId++;

  readonly hintId = `app-form-field-${this.fieldId}-hint`;
  readonly errorId = `app-form-field-${this.fieldId}-error`;

  readonly controlId = computed(() => this.control()?.id ?? null);

  readonly describedBy = computed(() => {
    const ids: string[] = [];
    if (this.hint()) {
      ids.push(this.hintId);
    }
    if (this.errors().length > 0) {
      ids.push(this.errorId);
    }
    return ids.length > 0 ? ids.join(' ') : null;
  });

  constructor() {
    // The control is projected by the parent template, so it cannot inject this field.
    effect(() => {
      this.control()?.link(this.describedBy(), this.errors().length > 0);
    });
  }
}
