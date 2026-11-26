import {
  DestroyRef,
  Directive,
  ElementRef,
  booleanAttribute,
  effect,
  inject,
  input,
  output,
} from '@angular/core';

const ROOT_MARGIN = '0px 0px 48px 0px';

@Directive({
  selector: '[appInfiniteScroll]',
})
export class InfiniteScroll {
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly reached = output<void>();

  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private observer: IntersectionObserver | null = null;
  private destroyed = false;

  constructor() {
    effect(() => {
      if (this.disabled()) {
        this.disconnect();
        return;
      }

      this.observe();
    });

    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.disconnect();
    });
  }

  private observe(): void {
    this.disconnect();
    if (this.destroyed) {
      return;
    }

    const sentinel = this.elementRef.nativeElement;
    this.observer = new IntersectionObserver(
      (entries) => {
        this.onIntersect(entries);
      },
      {
        root: scrollContainer(sentinel),
        rootMargin: ROOT_MARGIN,
        threshold: 0,
      },
    );
    this.observer.observe(sentinel);
  }

  private onIntersect(entries: IntersectionObserverEntry[]): void {
    if (this.destroyed || this.disabled() || !entries.some((entry) => entry.isIntersecting)) {
      return;
    }

    // One visit emits once. The parent disables the sentinel while the next page
    // loads and enables it again afterwards, which starts a new observation.
    this.disconnect();
    this.reached.emit();
  }

  private disconnect(): void {
    this.observer?.disconnect();
    this.observer = null;
  }
}

function scrollContainer(element: HTMLElement): HTMLElement | null {
  let parent = element.parentElement;
  while (parent) {
    const overflowY = getComputedStyle(parent).overflowY;
    if (overflowY === 'auto' || overflowY === 'scroll') {
      return parent;
    }

    parent = parent.parentElement;
  }

  return null;
}
