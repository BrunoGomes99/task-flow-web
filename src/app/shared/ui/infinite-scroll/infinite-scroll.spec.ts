import { render, screen } from '@testing-library/angular';
import { vi } from 'vitest';

import { InfiniteScroll } from './infinite-scroll';

class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];

  readonly root: Element | Document | null;
  readonly rootMargin: string;
  readonly thresholds: readonly number[];
  disconnected = false;
  readonly observed: Element[] = [];

  private readonly callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.root = options?.root ?? null;
    this.rootMargin = options?.rootMargin ?? '0px';
    const threshold = options?.threshold;
    this.thresholds = threshold == null ? [0] : Array.isArray(threshold) ? threshold : [threshold];
    FakeIntersectionObserver.instances.push(this);
  }

  observe(target: Element): void {
    this.observed.push(target);
  }

  unobserve(target: Element): void {
    const index = this.observed.indexOf(target);
    if (index >= 0) {
      this.observed.splice(index, 1);
    }
  }

  disconnect(): void {
    this.disconnected = true;
    this.observed.length = 0;
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  intersect(isIntersecting: boolean): void {
    const entries = this.observed.map((target) => ({
      time: 0,
      target,
      isIntersecting,
      intersectionRatio: isIntersecting ? 1 : 0,
      boundingClientRect: target.getBoundingClientRect(),
      intersectionRect: target.getBoundingClientRect(),
      rootBounds: null,
    }));
    this.callback(entries, this as unknown as IntersectionObserver);
  }
}

function activeObservers(): FakeIntersectionObserver[] {
  return FakeIntersectionObserver.instances.filter((observer) => !observer.disconnected);
}

describe('InfiniteScroll', () => {
  beforeEach(() => {
    FakeIntersectionObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('emits reached when the sentinel enters its own scroll container', async () => {
    const reached = vi.fn();
    await render(
      `
        <div data-testid="column" style="overflow-y: auto">
          <div data-testid="sentinel" appInfiniteScroll (reached)="reached()">end</div>
        </div>
      `,
      {
        imports: [InfiniteScroll],
        componentProperties: { reached },
      },
    );

    const observer = activeObservers()[0];
    expect(observer).toBeDefined();
    expect(observer?.root).toBe(screen.getByTestId('column'));
    expect(observer?.rootMargin).toBe('0px 0px 48px 0px');
    expect(observer?.observed).toContain(screen.getByTestId('sentinel'));

    observer?.intersect(false);
    expect(reached).not.toHaveBeenCalled();

    observer?.intersect(true);
    expect(reached).toHaveBeenCalledOnce();
  });

  it('does not observe while it is disabled', async () => {
    const reached = vi.fn();
    await render(
      `
        <div style="overflow-y: auto">
          <div appInfiniteScroll [disabled]="true" (reached)="reached()">end</div>
        </div>
      `,
      {
        imports: [InfiniteScroll],
        componentProperties: { reached },
      },
    );

    expect(activeObservers()).toHaveLength(0);
    expect(reached).not.toHaveBeenCalled();
  });

  it('emits once per visit and again only after it is enabled', async () => {
    const reached = vi.fn();
    const view = await render(
      `
        <div style="overflow-y: auto">
          <div appInfiniteScroll [disabled]="disabled" (reached)="reached()">end</div>
        </div>
      `,
      {
        imports: [InfiniteScroll],
        componentProperties: { reached, disabled: false },
      },
    );

    activeObservers()[0]?.intersect(true);
    activeObservers()[0]?.intersect(true);
    expect(reached).toHaveBeenCalledOnce();

    view.fixture.componentInstance.disabled = true;
    view.fixture.detectChanges();
    await view.fixture.whenStable();
    expect(activeObservers()).toHaveLength(0);

    view.fixture.componentInstance.disabled = false;
    view.fixture.detectChanges();
    await view.fixture.whenStable();

    activeObservers()[0]?.intersect(true);
    expect(reached).toHaveBeenCalledTimes(2);
  });

  it('does not notify another scroll container', async () => {
    const pendingReached = vi.fn();
    const completedReached = vi.fn();
    await render(
      `
        <div data-testid="pending" style="overflow-y: auto">
          <div data-testid="pending-sentinel" appInfiniteScroll (reached)="pendingReached()">
            end
          </div>
        </div>
        <div data-testid="completed" style="overflow-y: auto">
          <div data-testid="completed-sentinel" appInfiniteScroll (reached)="completedReached()">
            end
          </div>
        </div>
      `,
      {
        imports: [InfiniteScroll],
        componentProperties: { pendingReached, completedReached },
      },
    );

    const pending = screen.getByTestId('pending');
    const pendingObserver = activeObservers().find((observer) => observer.root === pending);
    pendingObserver?.intersect(true);

    expect(pendingReached).toHaveBeenCalledOnce();
    expect(completedReached).not.toHaveBeenCalled();
    expect(pendingObserver?.disconnected).toBe(true);
    expect(
      activeObservers().find((observer) => observer.root === screen.getByTestId('completed')),
    ).toBeDefined();
  });

  it('disconnects the observer when the sentinel is destroyed', async () => {
    const view = await render(
      `
        <div style="overflow-y: auto">
          <div appInfiniteScroll (reached)="reached()">end</div>
        </div>
      `,
      {
        imports: [InfiniteScroll],
        componentProperties: { reached: vi.fn() },
      },
    );

    const observer = activeObservers()[0];
    expect(observer).toBeDefined();

    view.fixture.destroy();

    expect(observer?.disconnected).toBe(true);
  });
});
