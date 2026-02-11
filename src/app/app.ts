import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MapComponent } from './components/map/map.component';
import { SearchBarComponent } from './components/searchBar/searchBar.component';
import { ResultatsComponent } from './components/resultats/resultats.component';
import { FiltreComponent } from './components/filtre/filtre.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MapComponent, SearchBarComponent,ResultatsComponent, FiltreComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('studyMap');
  protected readonly logoSrc = signal('assets/StudyMap.png');

  protected onThemeToggle() {
    if (typeof document === 'undefined') return;

    const conteneurTheme = document.getElementById('changerTheme');
    const iconeTheme = conteneurTheme ? conteneurTheme.querySelector('svg') as HTMLElement | null : null;

    // bascule et persiste
    const isDark = document.body.classList.toggle('dark-mode');
    try { localStorage.setItem('theme', isDark ? 'dark' : 'light'); } catch {}

    // images dans /src/assets
    if (isDark) {
      this.logoSrc.set('assets/6.png');
      if (iconeTheme) {
        iconeTheme.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"/></svg>`;
      }
    } else {
      this.logoSrc.set('assets/StudyMap.png');
      if (iconeTheme) {
        iconeTheme.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6"><path fill-rule="evenodd" d="M9.528 1.718a.75.75 0 0 1 .162.819A8.97 8.97 0 0 0 9 6a9 9 0 0 0 9 9 8.97 8.97 0 0 0 3.463-.69.75.75 0 0 1 .981.98 10.503 10.503 0 0 1-9.694 6.46c-5.799 0-10.5-4.7-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 0 1 .818.162Z" clip-rule="evenodd"/></svg>`;
      }
    }
  }
}