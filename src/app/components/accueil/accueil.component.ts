import { Component, signal } from '@angular/core';
import { SearchBarComponent } from '../searchBar/searchBar.component';
import { ResultatsComponent } from '../resultats/resultats.component';
import { FiltreComponent } from '../filtre/filtre.component';

/**
 * Composant AccueilComponent - Page d'accueil avec recherche et résultats
 * 
 * Layout:
 * - Barre de recherche (input ville)
 * - Filtres (région, type d'université...)
 * - Résultats (liste de villes filtrées)
 * 
 * Flux:
 * 1. Utilisateur tape une ville dans SearchBar
 * 2. SearchBar émet onSearch(ville)
 * 3. AccueilComponent met à jour searchTerm signal
 * 4. ResultatsComponent réagit au changement et filtre les villes
 */
@Component({
  selector: 'app-accueil', 
  standalone: true,        
  imports: [SearchBarComponent, ResultatsComponent, FiltreComponent],            
  templateUrl: './accueil.component.html',
  styleUrl: './accueil.component.scss'
})
export class AccueilComponent {
  /** Terme de recherche actuellement saisi */
  searchTerm = signal('');
  filtreActuel = signal('');

  onSearch(city: string) {
    this.searchTerm.set(city);
  }

  onFiltreChange(filtre: string) {
    this.filtreActuel.set(filtre);
  }
}