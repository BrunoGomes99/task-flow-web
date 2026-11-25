import { Routes } from '@angular/router';

import { BoardStore } from './data-access/board-store';

export const tasksRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/board-page/board-page').then((m) => m.BoardPage),
    providers: [BoardStore],
  },
];
