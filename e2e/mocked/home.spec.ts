import { expect, test } from '@playwright/test';

import { expectNoAxeViolations } from '../support/axe';
import { setTheme, type Theme } from '../support/theme';

const themes: readonly Theme[] = ['light', 'dark'];

for (const theme of themes) {
  test(`home page has no WCAG A/AA violations in the ${theme} theme`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/');

    const root = page.locator('html');
    if (theme === 'dark') {
      await expect(root).toHaveClass(/\bdark\b/);
    } else {
      await expect(root).not.toHaveClass(/\bdark\b/);
    }

    await expectNoAxeViolations(page);
  });
}
