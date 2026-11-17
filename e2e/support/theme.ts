import type { Page } from '@playwright/test';

/** Must match the key the inline script in index.html reads before Angular boots. */
export const themeStorageKey = 'taskflow.theme';

export type Theme = 'light' | 'dark';

export async function setTheme(page: Page, theme: Theme): Promise<void> {
  // The callback runs in the browser. Only the argument is available there.
  await page.addInitScript(
    ({ key, nextTheme }) => {
      localStorage.setItem(key, nextTheme);
    },
    { key: themeStorageKey, nextTheme: theme },
  );
}
