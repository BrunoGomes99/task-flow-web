import { ChangeDetectionStrategy, Component } from '@angular/core';

import { AuthCard } from '../../components/auth-card/auth-card';

@Component({
  selector: 'app-login-page',
  imports: [AuthCard],
  templateUrl: './login-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {}
