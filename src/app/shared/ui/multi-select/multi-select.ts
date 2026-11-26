import { CdkTrapFocus } from '@angular/cdk/a11y';
import { CdkListbox, CdkOption, type ListboxValueChangeEvent } from '@angular/cdk/listbox';
import { Overlay, type ConnectedPosition, type OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  TemplateRef,
  ViewContainerRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { LucideCheck, LucideChevronDown } from '@lucide/angular';
import { Subscription } from 'rxjs';

export interface MultiSelectOption {
  readonly value: string;
  readonly label: string;
}

const PANEL_POSITIONS: ConnectedPosition[] = [
  { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
  { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
];

let nextMultiSelectId = 0;

@Component({
  selector: 'app-multi-select',
  imports: [CdkListbox, CdkOption, CdkTrapFocus, LucideCheck, LucideChevronDown],
  templateUrl: './multi-select.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block w-full md:w-auto',
  },
})
export class MultiSelect {
  readonly label = input.required<string>();
  readonly options = input.required<readonly MultiSelectOption[]>();
  readonly selected = input.required<readonly string[]>();
  readonly lockedHint = input('Pelo menos um status deve ficar visível');
  readonly selectedChange = output<readonly string[]>();

  private readonly overlay = inject(Overlay);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly panel = viewChild.required('panel', { read: TemplateRef });

  protected readonly selection = signal<readonly string[]>([]);
  private echoedSelection: readonly string[] | null = null;
  private overlayRef: OverlayRef | null = null;
  private overlaySubscriptions = new Subscription();

  protected readonly open = signal(false);
  protected readonly listboxId: string;
  protected readonly buttonId: string;
  protected readonly hintId: string;

  protected readonly lockedValue = computed(() => {
    const selected = this.selection();
    return selected.length === 1 ? selected[0] : null;
  });

  constructor() {
    const id = nextMultiSelectId++;
    this.listboxId = `app-multi-select-${id}-listbox`;
    this.buttonId = `app-multi-select-${id}-button`;
    this.hintId = `app-multi-select-${id}-hint`;

    effect(() => {
      const incoming = this.selected();
      const echoed = untracked(() => this.echoedSelection);
      if (echoed !== null && sameValues(incoming, echoed)) {
        return;
      }

      const next = [...incoming];
      this.selection.set(next);
      this.echoedSelection = next;
    });

    inject(DestroyRef).onDestroy(() => this.destroyOverlay());
  }

  protected isSelected(value: string): boolean {
    return this.selection().includes(value);
  }

  protected toggle(): void {
    if (this.overlayRef) {
      this.close();
      return;
    }

    this.openPanel();
  }

  protected closeFromKeyboard(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.close();
  }

  protected onSelectionChange(event: ListboxValueChangeEvent<string>): void {
    // Ctrl+A can clear every enabled option at once. Put the previous selection
    // back so the list never ends up empty.
    if (event.value.length === 0) {
      event.listbox.value = this.selection();
      return;
    }

    const next = [...event.value];
    this.selection.set(next);
    this.echoedSelection = next;
    this.selectedChange.emit(next);
  }

  private openPanel(): void {
    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(this.trigger())
      .withPositions(PANEL_POSITIONS)
      .withPush(true);

    const overlay = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-transparent-backdrop',
      usePopover: false,
    });

    this.overlaySubscriptions.add(overlay.backdropClick().subscribe(() => this.close()));
    this.overlaySubscriptions.add(
      overlay.keydownEvents().subscribe((event) => {
        if (event.key === 'Escape') {
          this.closeFromKeyboard(event);
        }
      }),
    );

    this.overlayRef = overlay;
    this.open.set(true);
    overlay.attach(new TemplatePortal(this.panel(), this.viewContainerRef));
    overlay.overlayElement.querySelector<HTMLElement>('[role="listbox"]')?.focus();
  }

  private close(): void {
    const trigger = this.overlayRef ? this.trigger().nativeElement : null;
    this.destroyOverlay();
    trigger?.focus();
  }

  private destroyOverlay(): void {
    this.overlaySubscriptions.unsubscribe();
    this.overlaySubscriptions = new Subscription();
    this.overlayRef?.dispose();
    this.overlayRef = null;
    this.open.set(false);
  }
}

function sameValues(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value) => right.includes(value));
}
