import { Component, signal } from '@angular/core';
import { SearchBarComponent } from '../searchBar/searchBar.component';
import { FavorisDisplayComponent } from '../favoris-display/favoris-display.component';
import { FiltreComponent } from '../filtre/filtre.component';

@Component({
  selector: 'app-favoris', 
  standalone: true,         
  imports: [SearchBarComponent, FavorisDisplayComponent, FiltreComponent],            
  templateUrl: './favoris.component.html',
  styleUrl: './favoris.component.scss'
})
export class FavorisComponent {
  /** terme actuellement recherché */
  searchTerm = signal('');

  onSearch(city: string) {
    this.searchTerm.set(city);
  }

  get query() {
    return this.searchTerm();
  }
  filtreActuel = signal('');

  onFiltreChange(filtre: string) {
    this.filtreActuel.set(filtre);
  }
}