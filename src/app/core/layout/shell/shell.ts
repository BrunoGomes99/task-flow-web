import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Header } from '../header/header';

@Component({
  selector: 'app-shell',
  imports: [Header, RouterOutlet],
  templateUrl: './shell.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'grid min-h-dvh grid-cols-[16rem_minmax(0,1fr)] bg-background',
  },
})
export class Shell {}
