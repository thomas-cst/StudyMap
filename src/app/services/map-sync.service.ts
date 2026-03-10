import { Injectable, signal } from '@angular/core';

export interface ZoomTarget {
  ville: string;
  lat: number;
  lng: number;
}

@Injectable({
  providedIn: 'root'
})
export class MapSyncService {
  // Signal pour synchroniser le zoom entre les composants
  zoomTarget = signal<ZoomTarget | null>(null);

  // Signal pour tracker les villes récemment consultées
  recentlyViewed = signal<string[]>([]);

  /**
   * Ajoute une ville aux récemment consultées (sans zoom)
   */
  addToRecentlyViewed(ville: string) {
    const current = this.recentlyViewed();
    const filtered = current.filter(v => v !== ville);
    this.recentlyViewed.set([ville, ...filtered.slice(0, 9)]);
  }

  /**
   * Déclenche un zoom sur une ville
   */
  zoomToVille(ville: string, lat: number, lng: number) {
    console.log('MapSyncService: zoomToVille appelé pour', ville, { lat, lng });
    this.zoomTarget.set({
      ville,
      lat,
      lng
    });

    // Ajouter la ville aux récemment consultées
    this.addToRecentlyViewed(ville);
  }
}
