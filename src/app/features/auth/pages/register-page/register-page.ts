import { ChangeDetectionStrategy, Component } from '@angular/core';

import { AuthCard } from '../../components/auth-card/auth-card';

@Component({
  selector: 'app-register-page',
  imports: [AuthCard],
  templateUrl: './register-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPage {}
