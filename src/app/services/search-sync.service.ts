/**
 * Service SearchSync - Synchronisation de la barre de recherche entre composants
 * 
 * Permet a un composant enfant de demander au parent de vider la barre de recherche
 * Le signal utilise un timestamp unique pour declencher l'effet a chaque appel
 */
import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SearchSyncService {
  /** Signal avec un timestamp unique emis a chaque demande de vidage de la recherche */
  clearSearchRequested = signal(0);

  /** Demande aux composants parents de vider la barre de recherche */
  clearSearch() {
    this.clearSearchRequested.set(Date.now());
  }
}
