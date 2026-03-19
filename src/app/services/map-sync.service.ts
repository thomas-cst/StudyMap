/**
 * Service MapSync - Synchronisation entre les composants et la carte Leaflet
 * 
 * Utilise des signaux Angular pour :
 * - Demander un zoom vers une ville specifique
 * - Suivre les villes recemment consultees (10 max)
 */
import { Injectable, signal } from '@angular/core';

/** Interface representant une cible de zoom sur la carte */
export interface ZoomTarget {
  ville: string;
  lat: number;
  lng: number;
}

@Injectable({
  providedIn: 'root'
})
export class MapSyncService {
  /** Signal contenant la ville cible vers laquelle la carte doit zoomer */
  zoomTarget = signal<ZoomTarget | null>(null);

  /** Signal contenant les codes INSEE des villes recemment consultees (max 10) */
  recentlyViewed = signal<string[]>([]);

  /** Ajoute un code INSEE aux villes recemment consultees (garde les 10 dernieres) */
  addToRecentlyViewed(codeInsee: string) {
    const current = this.recentlyViewed();
    const filtered = current.filter(v => v !== codeInsee);
    this.recentlyViewed.set([codeInsee, ...filtered.slice(0, 9)]);
  }

  /** Declenche un zoom sur la carte vers les coordonnees de la ville donnee */
  zoomToVille(ville: string, lat: number, lng: number) {
    console.log('MapSyncService: zoomToVille appelé pour', ville, { lat, lng });
    this.zoomTarget.set({
      ville,
      lat,
      lng
    });
  }
}
