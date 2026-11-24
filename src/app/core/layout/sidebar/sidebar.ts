import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LucideLogOut } from '@lucide/angular';

import { Avatar } from '../../../shared/ui/avatar/avatar';
import { Button } from '../../../shared/ui/button/button';
import { SessionStore } from '../../auth/session-store';

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

  protected readonly profile = this.sessionStore.profile;
  protected readonly initials = this.sessionStore.initials;

  protected logout(): void {
    this.sessionStore.logout('user');
  }
}
