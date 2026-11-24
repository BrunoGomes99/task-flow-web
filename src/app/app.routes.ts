import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth-guard';
import { authRoutes } from './features/auth/auth.routes';

export const routes: Routes = [
  ...authRoutes,
  {
    path: 'tasks',
    canActivate: [authGuard],
    loadComponent: () => import('./core/layout/shell/shell').then((m) => m.Shell),
    loadChildren: () => import('./features/tasks/tasks.routes').then((m) => m.tasksRoutes),
  },
  { path: '', pathMatch: 'full', redirectTo: '/tasks' },
  { path: '**', redirectTo: '/tasks' },
];
