import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MapComponent } from './components/map/map.component';
import { AccueilComponent } from './components/accueil/accueil.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MapComponent,AccueilComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('studyMap');

  protected onThemeToggle() {
    console.log('Thème changé!');
  }
}