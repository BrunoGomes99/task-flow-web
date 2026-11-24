import { render } from '@testing-library/angular';

import { Avatar } from './avatar';

describe('Avatar', () => {
  it('shows the initials and hides them from assistive technology', async () => {
    const { fixture } = await render(Avatar, { inputs: { initials: 'BG' } });

    const avatar = fixture.nativeElement as HTMLElement;
    expect(avatar).toHaveTextContent('BG');
    expect(avatar).toHaveAttribute('aria-hidden', 'true');
  });

  it('shows a single letter', async () => {
    const { fixture } = await render(Avatar, { inputs: { initials: 'B' } });

    expect(fixture.nativeElement).toHaveTextContent('B');
  });
});
