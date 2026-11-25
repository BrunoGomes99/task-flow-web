import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import { Tooltip } from './tooltip';

const TOOLTIP_TEXT = 'Tarefas concluídas ficam travadas e não podem ser editadas nem movidas.';

async function renderTrigger() {
  await render(`<button type="button" appTooltip="${TOOLTIP_TEXT}">Info</button>`, {
    imports: [Tooltip],
  });

  return screen.getByRole('button', { name: 'Info' });
}

describe('Tooltip', () => {
  it('shows the tooltip when the trigger receives focus and links it with aria-describedby', async () => {
    const user = userEvent.setup();
    const trigger = await renderTrigger();

    await user.tab();

    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent(TOOLTIP_TEXT);
    expect(trigger).toHaveAccessibleDescription(TOOLTIP_TEXT);
  });

  it('shows the tooltip while the pointer is over the trigger', async () => {
    const user = userEvent.setup();
    const trigger = await renderTrigger();

    await user.hover(trigger);

    expect(await screen.findByRole('tooltip')).toHaveTextContent(TOOLTIP_TEXT);
  });
});
