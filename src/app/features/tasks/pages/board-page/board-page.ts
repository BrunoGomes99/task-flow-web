import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-board-page',
  templateUrl: './board-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardPage {}
