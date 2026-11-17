import { render, screen } from '@testing-library/angular';

import { App } from './app';

describe('App', () => {
  it('renders the router outlet and no placeholder heading', async () => {
    const { container } = await render(App);

    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(container.querySelector('router-outlet')).toBeInTheDocument();
  });
});
