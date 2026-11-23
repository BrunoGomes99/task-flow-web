import { render, screen } from '@testing-library/angular';

import { FormField, FormFieldControl } from './form-field';

describe('FormField', () => {
  it('links the error to the control with aria-describedby', async () => {
    await render(
      `
        <app-form-field label="E-mail" [errors]="['Informe um e-mail válido.']">
          <input appFormFieldControl type="email" />
        </app-form-field>
      `,
      { imports: [FormField, FormFieldControl] },
    );

    const control = screen.getByLabelText('E-mail');

    expect(control).toHaveAccessibleDescription('Informe um e-mail válido.');
    expect(control).toHaveAttribute('aria-invalid', 'true');
  });

  it('links the hint and leaves the control valid when there is no error', async () => {
    await render(
      `
        <app-form-field label="E-mail" hint="Usaremos este e-mail para entrar.">
          <input appFormFieldControl type="email" />
        </app-form-field>
      `,
      { imports: [FormField, FormFieldControl] },
    );

    const control = screen.getByLabelText('E-mail');

    expect(control).toHaveAccessibleDescription('Usaremos este e-mail para entrar.');
    expect(control).not.toHaveAttribute('aria-invalid');
  });
});
