import { AxeBuilder } from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

const wcagAAndAaTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

export async function expectNoAxeViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(wcagAAndAaTags).analyze();
  const details = results.violations
    .map((violation) => {
      const targets = violation.nodes.map((node) => node.target.join(' ')).join(', ');
      return `${violation.id}: ${violation.help} (${targets})`;
    })
    .join('\n');

  expect(results.violations, details).toEqual([]);
}
