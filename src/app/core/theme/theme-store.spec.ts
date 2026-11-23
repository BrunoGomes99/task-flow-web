import { TestBed } from '@angular/core/testing';

import { COLOR_SCHEME, type ColorScheme, THEME_STORAGE_KEY, ThemeStore } from './theme-store';

class FakeColorScheme implements ColorScheme {
  private listener: ((matchesDark: boolean) => void) | undefined;

  listen(onChange: (matchesDark: boolean) => void): () => void {
    this.listener = onChange;
    return () => {
      this.listener = undefined;
    };
  }

  preferDark(matchesDark: boolean): void {
    this.listener?.(matchesDark);
  }
}

describe('ThemeStore', () => {
  let colorScheme: FakeColorScheme;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    colorScheme = new FakeColorScheme();

    TestBed.configureTestingModule({
      providers: [{ provide: COLOR_SCHEME, useValue: colorScheme }],
    });
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  function store(): ThemeStore {
    return TestBed.inject(ThemeStore);
  }

  it('reads a dark initial theme from the class set before boot', () => {
    document.documentElement.classList.add('dark');

    expect(store().theme()).toBe('dark');
  });

  it('reads a light initial theme when the dark class is absent', () => {
    expect(store().theme()).toBe('light');
  });

  it('persists the toggled theme and updates the dark class', () => {
    const themeStore = store();

    themeStore.toggle();
    TestBed.tick();

    expect(themeStore.theme()).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    themeStore.toggle();
    TestBed.tick();

    expect(themeStore.theme()).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('follows an OS scheme change only when there is no saved choice', () => {
    const themeStore = store();

    colorScheme.preferDark(true);
    TestBed.tick();

    expect(themeStore.theme()).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();

    colorScheme.preferDark(false);
    TestBed.tick();

    expect(themeStore.theme()).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it('keeps a saved choice when the OS scheme changes', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    const themeStore = store();

    colorScheme.preferDark(true);
    TestBed.tick();

    expect(themeStore.theme()).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('stops following the OS after the user toggles', () => {
    const themeStore = store();
    themeStore.toggle();
    TestBed.tick();

    colorScheme.preferDark(false);
    TestBed.tick();

    expect(themeStore.theme()).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('treats an unknown stored value as no choice', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'system');
    const themeStore = store();

    colorScheme.preferDark(true);
    TestBed.tick();

    expect(themeStore.theme()).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('system');
  });
});
