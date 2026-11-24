import { CdkTrapFocus } from '@angular/cdk/a11y';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { LucideMenu } from '@lucide/angular';
import { filter } from 'rxjs';

import { SummaryStore } from '../../task-summary/summary-store';
import { Header } from '../header/header';
import { Sidebar } from '../sidebar/sidebar';

@Component({
  selector: 'app-shell',
  imports: [CdkTrapFocus, Header, LucideMenu, RouterOutlet, Sidebar],
  templateUrl: './shell.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'grid min-h-dvh grid-cols-1 bg-background lg:grid-cols-[16rem_minmax(0,1fr)]',
    '(document:keydown.escape)': 'onEscape($event)',
  },
})
export class Shell {
  private readonly summaryStore = inject(SummaryStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly menuButton = viewChild<ElementRef<HTMLButtonElement>>('menuButton');

  protected readonly sidebarOpen = signal(false);
  protected readonly sidebarPanelClass = computed(() => {
    const placement = 'col-start-1 row-start-1';
    if (this.sidebarOpen()) {
      return [
        placement,
        'fixed inset-y-0 left-0 z-40 h-dvh w-64 overflow-y-auto shadow-xl',
        'lg:static lg:z-auto lg:h-full lg:w-auto lg:overflow-visible lg:shadow-none',
      ].join(' ');
    }

    return `${placement} h-full max-lg:hidden`;
  });

  constructor() {
    // A new shell means a new visit to the authenticated layout. Resetting here
    // drops the previous user's counts before the next response arrives.
    this.summaryStore.load();

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.closeSidebar());

    // The drawer is modal only below lg. Crossing that breakpoint must drop the
    // trap, because the sidebar is then a normal column.
    const desktop = window.matchMedia('(min-width: 64rem)');
    const closeOnDesktop = (): void => {
      if (desktop.matches) {
        this.sidebarOpen.set(false);
      }
    };
    desktop.addEventListener('change', closeOnDesktop);
    this.destroyRef.onDestroy(() => desktop.removeEventListener('change', closeOnDesktop));
  }

  protected toggleSidebar(): void {
    if (this.sidebarOpen()) {
      this.closeSidebar();
      return;
    }

    this.sidebarOpen.set(true);
  }

  protected closeSidebar(): void {
    if (!this.sidebarOpen()) {
      return;
    }

    this.sidebarOpen.set(false);
    this.restoreMenuFocus();
  }

  protected onEscape(event: Event): void {
    if (!this.sidebarOpen()) {
      return;
    }

    event.preventDefault();
    this.closeSidebar();
  }

  private restoreMenuFocus(): void {
    afterNextRender(() => this.menuButton()?.nativeElement.focus(), { injector: this.injector });
  }
}
