import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { render, screen } from '@testing-library/angular';

import { AuthCard } from './auth-card';

describe('AuthCard', () => {
  async function renderCard(): Promise<void> {
    await render(AuthCard, {
      providers: [
        provideRouter([
          { path: 'login', component: AuthCard },
          { path: 'register', component: AuthCard },
        ]),
      ],
    });
  }

  it('shows the logo, the subtitle and the two route tabs', async () => {
    await renderCard();

    expect(screen.getByRole('img', { name: 'TaskFlow' })).toBeInTheDocument();
    expect(screen.getByText('Gerenciador de Tarefas no estilo Kanban')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Criar Conta' })).toHaveAttribute('href', '/register');
    expect(screen.queryByText(/preencher dados de teste/i)).not.toBeInTheDocument();
  });

  it('marks the current route tab with aria-current', async () => {
    await renderCard();
    await TestBed.inject(Router).navigateByUrl('/register');

    expect(screen.getByRole('link', { name: 'Criar Conta' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Entrar' })).not.toHaveAttribute('aria-current');
  });

  it('projects the page content', async () => {
    await render('<app-auth-card><p>Formulário</p></app-auth-card>', {
      imports: [AuthCard],
      providers: [
        provideRouter([
          { path: 'login', component: AuthCard },
          { path: 'register', component: AuthCard },
        ]),
      ],
    });

    expect(screen.getByText('Formulário')).toBeInTheDocument();
  });
});
