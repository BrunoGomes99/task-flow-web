import { Overlay, type ConnectedPosition, type OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import {
  DestroyRef,
  Directive,
  ElementRef,
  ViewContainerRef,
  computed,
  inject,
  input,
  signal,
  type ComponentRef,
} from '@angular/core';

import { TooltipBubble } from './tooltip-bubble';

let nextTooltipId = 0;

const TOOLTIP_POSITIONS: ConnectedPosition[] = [
  { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top', offsetY: 8 },
  { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom', offsetY: -8 },
];

@Directive({
  selector: '[appTooltip]',
  host: {
    '(mouseenter)': 'onPointerEnter()',
    '(mouseleave)': 'onPointerLeave()',
    '(focus)': 'onFocus()',
    '(blur)': 'onBlur()',
    '[attr.aria-describedby]': 'describedBy()',
  },
})
export class Tooltip {
  readonly appTooltip = input.required<string>();

  private readonly overlay = inject(Overlay);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly tooltipId = `app-tooltip-${nextTooltipId++}`;
  private readonly visible = signal(false);

  private overlayRef: OverlayRef | null = null;
  private bubble: ComponentRef<TooltipBubble> | null = null;
  private pointerInside = false;
  private focused = false;

  protected readonly describedBy = computed(() => (this.visible() ? this.tooltipId : null));

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.hide();
    });
  }

  protected onPointerEnter(): void {
    this.pointerInside = true;
    this.show();
  }

  protected onPointerLeave(): void {
    this.pointerInside = false;
    this.closeIfIdle();
  }

  protected onFocus(): void {
    this.focused = true;
    this.show();
  }

  protected onBlur(): void {
    this.focused = false;
    this.closeIfIdle();
  }

  private show(): void {
    if (this.appTooltip().trim().length === 0 || this.overlayRef?.hasAttached() === true) {
      return;
    }

    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(this.elementRef)
      .withPositions(TOOLTIP_POSITIONS)
      .withPush(true);

    // The popover top layer stays hidden until the browser opens it. The overlay
    // container is what overlay-prebuilt.css positions, and what assistive tech can see.
    this.overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      usePopover: false,
    });
    this.bubble = this.overlayRef.attach(new ComponentPortal(TooltipBubble, this.viewContainerRef));
    this.bubble.setInput('tooltipId', this.tooltipId);
    this.bubble.setInput('message', this.appTooltip());
    this.visible.set(true);
  }

  private closeIfIdle(): void {
    if (!this.pointerInside && !this.focused) {
      this.hide();
    }
  }

  private hide(): void {
    this.visible.set(false);
    this.overlayRef?.dispose();
    this.overlayRef = null;
    this.bubble = null;
  }
}
