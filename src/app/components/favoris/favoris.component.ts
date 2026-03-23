/**
 * Composant Favoris - Affiche les villes favorites de l'utilisateur
 * 
 * Contient une barre de recherche, des filtres et le composant FavorisDisplay
 * Ecoute le service SearchSyncService pour vider la recherche quand necessaire
 */
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
  /** Terme de recherche actuellement saisi par l'utilisateur */
  searchTerm = signal('');

  /** Service de synchronisation de la barre de recherche entre composants */
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

  /** Met a jour le terme de recherche avec la ville saisie */
  onSearch(city: string) {
    this.searchTerm.set(city);
  }

  /** Getter pour acceder a la valeur du signal dans le template */
  get query() {
    return this.searchTerm();
  }

  /** Filtre actuellement selectionne */
  filtreActuel = signal('');

  /** Met a jour le filtre selectionne */
  onFiltreChange(filtre: string) {
    this.filtreActuel.set(filtre);
  }
}