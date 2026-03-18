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

  // Signal pour tracker les codes INSEE des villes récemment consultées
  // (on utilise les codes au lieu des noms pour être robuste aux variations de noms)
  recentlyViewed = signal<string[]>([]);

  /**
   * Ajoute un code INSEE aux récemment consultées (sans zoom)
   */
  addToRecentlyViewed(codeInsee: string) {
    const current = this.recentlyViewed();
    const filtered = current.filter(v => v !== codeInsee);
    this.recentlyViewed.set([codeInsee, ...filtered.slice(0, 9)]);
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
  }
}
