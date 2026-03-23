/**
 * Composant Classement - Affiche le classement des villes avec recherche et filtres
 * 
 * Structure similaire a AccueilComponent, avec en plus :
 * - Ecoute du service SearchSyncService pour vider la recherche
 * - Signal filtreActuel pour gerer les filtres selectionnes
 */
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

  /** Filtre actuellement selectionne (mer, montagne, etc.) */
  filtreActuel = signal('');

  /** Met a jour le filtre selectionne */
  onFiltreChange(filtre: string) {
    this.filtreActuel.set(filtre);
  }
}