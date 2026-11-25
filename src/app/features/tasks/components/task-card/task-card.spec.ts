import { render, screen } from '@testing-library/angular';

import type { Task } from '../../models/task';
import { TaskCard } from './task-card';

const NOW = new Date(2026, 10, 25, 15, 0, 0);

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Estudar Angular',
    description: 'Ler a documentação do componente.',
    status: 'pending',
    dueAt: null,
    createdAt: new Date(2026, 10, 1, 12, 0, 0),
    updatedAt: new Date(2026, 10, 1, 12, 0, 0),
    ...overrides,
  };
}

async function renderCard(value: Task) {
  await render(TaskCard, { inputs: { task: value, now: NOW } });
}

describe('TaskCard', () => {
  it('shows the title, a three-line description and Sem prazo when there is no due date', async () => {
    await renderCard(task());

    expect(screen.getByRole('heading', { name: 'Estudar Angular' })).toBeInTheDocument();
    expect(screen.getByText('Ler a documentação do componente.')).toHaveClass('line-clamp-3');
    expect(screen.getByText('Sem prazo')).toBeInTheDocument();
    expect(screen.queryByText(/atrasada/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Concluída (Travada)' })).not.toBeInTheDocument();
  });

  it('shows the due date when it is still today', async () => {
    await renderCard(task({ dueAt: new Date(2026, 10, 25, 23, 59, 59) }));

    expect(screen.getByText('25/11/2026')).toBeInTheDocument();
    expect(screen.queryByText(/atrasada/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Sem prazo')).not.toBeInTheDocument();
  });

  it('shows the due date as overdue with an icon when it is before today', async () => {
    await renderCard(task({ dueAt: new Date(2026, 10, 24, 23, 59, 59) }));

    const badge = screen.getByText('24/11/2026 (Atrasada)');
    expect(badge.querySelector('svg')).not.toBeNull();
  });

  it('shows the lock text on a completed card', async () => {
    await renderCard(task({ status: 'completed', description: '' }));

    expect(screen.getByRole('img', { name: 'Concluída (Travada)' })).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('ignores overdue on a completed card', async () => {
    await renderCard(
      task({
        status: 'completed',
        dueAt: new Date(2026, 10, 24, 23, 59, 59),
        description: '',
      }),
    );

    expect(screen.getByText('24/11/2026')).toBeInTheDocument();
    expect(screen.queryByText(/atrasada/i)).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Concluída (Travada)' })).toBeInTheDocument();
  });
});
