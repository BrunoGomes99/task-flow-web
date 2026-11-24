import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { SummaryStore } from '../../task-summary/summary-store';
import { Header } from '../header/header';
import { Sidebar } from '../sidebar/sidebar';

@Component({
  selector: 'app-shell',
  imports: [Header, RouterOutlet, Sidebar],
  templateUrl: './shell.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'grid min-h-dvh grid-cols-[16rem_minmax(0,1fr)] bg-background',
  },
})
export class Shell {
  private readonly summaryStore = inject(SummaryStore);

  constructor() {
    // A new shell means a new visit to the authenticated layout. Resetting here
    // drops the previous user's counts before the next response arrives.
    this.summaryStore.load();
  }
}
