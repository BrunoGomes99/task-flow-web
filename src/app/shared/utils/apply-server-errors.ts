import { FormGroup } from '@angular/forms';

export function applyServerErrors(
  form: FormGroup,
  fieldErrors: Record<string, string[]>,
): string[] {
  const unmatched: string[] = [];

  for (const [key, messages] of Object.entries(fieldErrors)) {
    const control = form.get(key);
    if (control === null) {
      unmatched.push(key);
      continue;
    }

    control.setErrors({ ...control.errors, server: messages });
  }

  return unmatched;
}
