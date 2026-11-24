import { DOCUMENT } from '@angular/common';
import {
  DestroyRef,
  Injectable,
  InjectionToken,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';

export const THEME_STORAGE_KEY = 'taskflow.theme';

export type Theme = 'light' | 'dark';

export interface ColorScheme {
  listen(onChange: (matchesDark: boolean) => void): () => void;
}

export const COLOR_SCHEME = new InjectionToken<ColorScheme>('COLOR_SCHEME', {
  providedIn: 'root',
  factory: () => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    return {
      listen(onChange) {
        const handler = (event: MediaQueryListEvent): void => {
          onChange(event.matches);
        };
        media.addEventListener('change', handler);
        return () => {
          media.removeEventListener('change', handler);
        };
      },
    };
  },
});

interface ThemeStorage {
  read(): Theme | null;
  write(theme: Theme): void;
}

const THEME_STORAGE = new InjectionToken<ThemeStorage>('THEME_STORAGE', {
  providedIn: 'root',
  factory: () => ({
    read() {
      try {
        return parseTheme(localStorage.getItem(THEME_STORAGE_KEY));
      } catch {
        return null;
      }
    },
    write(theme) {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
      } catch {
        // Private mode or blocked storage must not break the toggle.
      }
    },
  }),
});

interface ThemeState {
  readonly theme: Theme;
  readonly explicit: boolean;
}

@Injectable({ providedIn: 'root' })
export class ThemeStore {
  private readonly document = inject(DOCUMENT);
  private readonly storage = inject(THEME_STORAGE);
  private readonly colorScheme = inject(COLOR_SCHEME);
  private readonly state = signal(readInitialState(this.document, this.storage));

  readonly theme = computed(() => this.state().theme);

  constructor() {
    const stop = this.colorScheme.listen((matchesDark) => {
      this.followSystem(matchesDark);
    });
    inject(DestroyRef).onDestroy(stop);

    effect(() => {
      const current = this.state();
      this.document.documentElement.classList.toggle('dark', current.theme === 'dark');
      if (current.explicit) {
        this.storage.write(current.theme);
      }
    });
  }

  toggle(): void {
    this.state.update((current) => ({
      theme: current.theme === 'dark' ? 'light' : 'dark',
      explicit: true,
    }));
  }

  private followSystem(matchesDark: boolean): void {
    this.state.update((current) => {
      if (current.explicit) {
        return current;
      }

      const theme: Theme = matchesDark ? 'dark' : 'light';
      if (current.theme === theme) {
        return current;
      }

      return { theme, explicit: false };
    });
  }
}

function readInitialState(documentRef: Document, storage: ThemeStorage): ThemeState {
  // index.html already painted the saved choice or the OS scheme. The class is
  // the current theme; storage only records whether the user has chosen.
  const theme: Theme = documentRef.documentElement.classList.contains('dark') ? 'dark' : 'light';
  return { theme, explicit: storage.read() !== null };
}

function parseTheme(value: string | null): Theme | null {
  return value === 'light' || value === 'dark' ? value : null;
}
