import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MapComponent } from './components/map/map.component';
import { SearchBarComponent } from './components/searchBar/searchBar.component';
import { ResultatsComponent } from './components/resultats/resultats.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MapComponent, SearchBarComponent,ResultatsComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('studyMap');
}
