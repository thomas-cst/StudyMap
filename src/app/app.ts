import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MapComponent } from './components/map/map.component';
import { FiltreComponent } from './components/filtre/filtre.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MapComponent, FiltreComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('studyMap');
}
