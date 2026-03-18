import { Component, signal, inject, effect } from '@angular/core';
import { SearchBarComponent } from '../searchBar/searchBar.component';
import { ResultatsComponent } from '../resultats/resultats.component';
import { FiltreComponent } from '../filtre/filtre.component';
import { SearchSyncService } from '../../services/search-sync.service';

@Component({
  selector: 'app-classement', 
  standalone: true,         
  imports: [SearchBarComponent, ResultatsComponent, FiltreComponent],            
  templateUrl: './classement.component.html',
  styleUrl: './classement.component.scss'
})
export class ClassementComponent {
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
}