import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { LucideMoon, LucideSun } from '@lucide/angular';

import { ThemeStore } from '../theme-store';

@Component({
  selector: 'app-theme-toggle',
  imports: [LucideSun, LucideMoon],
  templateUrl: './theme-toggle.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'inline-flex',
  },
})
export class ThemeToggle {
  private readonly themeStore = inject(ThemeStore);

  protected readonly theme = this.themeStore.theme;

  protected readonly label = computed(() =>
    this.theme() === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro',
  );

  protected toggle(): void {
    this.themeStore.toggle();
  }
}
