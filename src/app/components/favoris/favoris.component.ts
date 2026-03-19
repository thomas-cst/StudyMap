import { Component, signal, inject, effect } from '@angular/core';
import { SearchBarComponent } from '../searchBar/searchBar.component';
import { FavorisDisplayComponent } from '../favoris-display/favoris-display.component';
import { FiltreComponent } from '../filtre/filtre.component';
import { SearchSyncService } from '../../services/search-sync.service';

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

  private searchSyncService = inject(SearchSyncService);

  constructor() {
    // Écouter les demandes de vider la recherche
    effect(() => {
      const clearTimestamp = this.searchSyncService.clearSearchRequested();
      // Si le timestamp est > 0, cela signifie qu'on a reçu une demande de vider
      if (clearTimestamp > 0) {
        this.searchTerm.set('');
      }
    });
  }

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