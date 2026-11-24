import { Routes } from '@angular/router';

export const tasksRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/board-page/board-page').then((m) => m.BoardPage),
  },
];
