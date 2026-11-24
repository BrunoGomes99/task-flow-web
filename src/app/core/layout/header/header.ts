import { ChangeDetectionStrategy, Component } from '@angular/core';

import { ThemeToggle } from '../../theme/theme-toggle/theme-toggle';

@Component({
  selector: 'app-header',
  imports: [ThemeToggle],
  templateUrl: './header.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {}
