import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import { THEME_STORAGE_KEY } from '../theme-store';
import { ThemeToggle } from './theme-toggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('names the action of activating the dark theme while the page is light', async () => {
    await render(ThemeToggle);

    expect(screen.getByRole('button', { name: 'Ativar tema escuro' })).toBeInTheDocument();
  });

  it('names the action of activating the light theme after it is toggled', async () => {
    const user = userEvent.setup();
    await render(ThemeToggle);

    await user.click(screen.getByRole('button', { name: 'Ativar tema escuro' }));
    TestBed.tick();

    expect(screen.getByRole('button', { name: 'Ativar tema claro' })).toBeInTheDocument();
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('names the action of activating the light theme when the page is already dark', async () => {
    document.documentElement.classList.add('dark');
    await render(ThemeToggle);

    expect(screen.getByRole('button', { name: 'Ativar tema claro' })).toBeInTheDocument();
  });
});
