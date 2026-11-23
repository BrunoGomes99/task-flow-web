import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth-guard';
import { authRoutes } from './features/auth/auth.routes';

export const routes: Routes = [
  ...authRoutes,
  {
    path: 'tasks',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/tasks/pages/board-page/board-page').then((m) => m.BoardPage),
  },
  { path: '', pathMatch: 'full', redirectTo: '/tasks' },
  { path: '**', redirectTo: '/tasks' },
];
