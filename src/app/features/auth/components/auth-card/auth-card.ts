import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-auth-card',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './auth-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block w-full max-w-md',
  },
})
export class AuthCard {}
