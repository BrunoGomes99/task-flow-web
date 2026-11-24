import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { LucideLogOut } from '@lucide/angular';

import { Avatar } from '../../../shared/ui/avatar/avatar';
import { Button } from '../../../shared/ui/button/button';
import { SessionStore } from '../../auth/session-store';
import { SummaryStore } from '../../task-summary/summary-store';

@Component({
  selector: 'app-sidebar',
  imports: [Avatar, Button, LucideLogOut],
  templateUrl: './sidebar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block h-full',
  },
})
export class Sidebar {
  private readonly sessionStore = inject(SessionStore);
  private readonly summaryStore = inject(SummaryStore);

  protected readonly profile = this.sessionStore.profile;
  protected readonly initials = this.sessionStore.initials;
  protected readonly summary = this.summaryStore.summary;
  protected readonly rows = summaryRows;
  protected readonly showSkeleton = computed(
    () => this.summaryStore.summary() === null && !this.summaryStore.error(),
  );
  protected readonly showError = computed(
    () => this.summaryStore.error() && this.summaryStore.summary() === null,
  );

  protected logout(): void {
    this.sessionStore.logout('user');
  }
}

const summaryRows = [
  { status: 'pending', label: 'Pendente' },
  { status: 'inProgress', label: 'Em Andamento' },
  { status: 'completed', label: 'Concluída' },
] as const;
