import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SearchSyncService {
  // Signal avec un timestamp unique chaque fois qu'on demande de vider
  clearSearchRequested = signal(0);

  /**
   * Demande au parent de vider la barre de recherche
   */
  clearSearch() {
    this.clearSearchRequested.set(Date.now());
  }
}
