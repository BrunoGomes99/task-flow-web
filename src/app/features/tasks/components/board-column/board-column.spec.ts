import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import type { Task, TaskStatus } from '../../models/task';
import { BoardColumn } from './board-column';

const NOW = new Date(2026, 10, 25, 15, 0, 0);
const LOCKED_HINT = 'Tarefas concluídas ficam travadas e não podem ser editadas nem movidas.';

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Estudar Angular',
    description: 'Ler a documentação.',
    status: 'pending',
    dueAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

async function renderColumn(
  overrides: {
    status?: TaskStatus;
    tasks?: readonly Task[];
    count?: number;
    loading?: boolean;
    error?: boolean;
  } = {},
  onRetry?: (value: void) => void,
) {
  await render(BoardColumn, {
    inputs: {
      status: overrides.status ?? 'pending',
      tasks: overrides.tasks ?? [],
      count: overrides.count ?? 0,
      now: NOW,
      loading: overrides.loading ?? false,
      error: overrides.error ?? false,
    },
    on: onRetry ? { retry: onRetry } : {},
  });
}

describe('BoardColumn', () => {
  it('shows the status label, the total count and the tasks', async () => {
    await renderColumn({ tasks: [task()], count: 8 });

    expect(screen.getByRole('heading', { name: 'Pendente' })).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getByText('Estudar Angular')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Informações sobre tarefas concluídas' }),
    ).not.toBeInTheDocument();
  });

  it('shows the empty state when the column has no tasks', async () => {
    await renderColumn();

    expect(screen.getByText('Nenhuma tarefa nesta coluna')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('shows an error state and emits retry', async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    await renderColumn({ status: 'inProgress', error: true }, retry);

    expect(screen.queryByText('Nenhuma tarefa nesta coluna')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('shows a loading skeleton instead of the empty state', async () => {
    await renderColumn({ loading: true });

    expect(screen.getByRole('status', { name: 'Carregando tarefas' })).toBeInTheDocument();
    expect(screen.queryByText('Nenhuma tarefa nesta coluna')).not.toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('explains that completed tasks stay locked', async () => {
    const user = userEvent.setup();
    await renderColumn({ status: 'completed', count: 1, tasks: [task({ status: 'completed' })] });

    const info = screen.getByRole('button', { name: 'Informações sobre tarefas concluídas' });
    await user.click(info);

    expect(await screen.findByRole('tooltip')).toHaveTextContent(LOCKED_HINT);
    expect(info).toHaveAccessibleDescription(LOCKED_HINT);
  });

  it('projects the bottom sentinel', async () => {
    await render(
      `
        <app-board-column [status]="status" [tasks]="tasks" [count]="count" [now]="now">
          <div data-testid="sentinel"></div>
        </app-board-column>
      `,
      {
        imports: [BoardColumn],
        componentProperties: {
          status: 'pending' as const,
          tasks: [] as Task[],
          count: 0,
          now: NOW,
        },
      },
    );

    expect(screen.getByTestId('sentinel')).toBeInTheDocument();
  });
});
