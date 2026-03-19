/**
 * Service VillesService
 * Récupère les villes depuis le backend /api/villes (Supabase)
 * Cache en mémoire + localStorage pour éviter les requêtes inutiles
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, catchError, tap } from 'rxjs';

export interface Ville {
  id_ville?: number;
  nom: string;
  code: string;        // Code INSEE
  imageUrl: string;    // URL image Wikipedia
  lat?: number;
  lng?: number;
}

/** Format Open-Meteo Geocoding */
interface OpenMeteoGeocodingResult {
  latitude: number;
  longitude: number;
  name: string;
  admin1: string;
  country: string;
}

@Injectable({
  providedIn: 'root'
})
export class VillesService {

  // Villes d'outre-mer à exclure
  private villesOutreMer = new Set([
    'Fort-de-France', 'Pointe-à-Pitre', 'Cayenne', 'Saint-Denis', 'Mamoudzou', 'Nouméa', 'Papeete','Dembeni','Punaauia'
  ]);

  //Villes proches de la mer
  private villesMer = new Set(['Brest', 'Lorient', 'Nantes', 'La Rochelle', 'Bordeaux',
    'Bayonne','Montpellier', 'Perpignan', 'Marseille', 'Toulon', 'Nice', 'Aix-en-Provence',
    'Caen', 'Le Havre', 'Rouen', 'Dunkerque','Ajaccio', 'Corte',
  ]);

  // Villes montagneuses
  private villesMontagne = new Set([
    'Grenoble', 'Chambéry', 'Annecy', 'Valence', 'Gap',
    'Clermont-Ferrand', 'Aurillac', 'Le Puy-en-Velay',
    'Besançon', 'Belfort', 'Mulhouse', 'Colmar', 'Strasbourg',
    'Metz', 'Nancy', 'Épinal',
    'Nice', 'Digne-les-Bains',
    'Pau', 'Tarbes', 'Foix',
    'Perpignan', 'Montpellier',
    'Bourg-en-Bresse', 'Lons-le-Saunier',
  ]);


  // Cache des coordonnées (vide au départ, se remplit via Wikidata)
  private coordinatesCache: { [key: string]: { lat: number; lng: number } } = {};

  // Corrections manuelles depuis assets/city-coordinates-fixes.json
  private coordinatesFixes: { [key: string]: { lat: number; lng: number } } = {};

  private cacheKey = 'villes_cache_v2';
  private villesCache: Ville[] | null = null;
  private openMeteoBaseUrl = 'https://geocoding-api.open-meteo.com/v1/search';

  constructor(private http: HttpClient) {
    this.loadCoordinatesFixes();
  }

  /** Charge les corrections manuelles de coordonnées */
  private loadCoordinatesFixes(): void {
    // TODO: Charger depuis assets/city-coordinates-fixes.json si nécessaire
  }


  //Vérifie si une ville est en bord de mer
  isVilleMer(nom: string): boolean {
    return this.villesMer.has(nom);
  }
 
  // Vérifie si une ville est en montagne
  isVilleMontagne(nom: string): boolean {
    return this.villesMontagne.has(nom);
  }
 

  /**
   * Récupère la liste des villes avec universités via l'API Data ESR
   */
  getVilles(): Observable<Ville[]> {
    if (this.villesCache) {
      return of(this.villesCache);
    }

    // Vérifie si on est côté navigateur et essayer localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      const cached = localStorage.getItem(this.cacheKey);
      if (cached) {
        this.villesCache = JSON.parse(cached);
        return of(this.villesCache!);
      }
    }

    // Backend /api/villes
    return this.loadVillesFromBackend().pipe(
      tap(villes => {
        this.villesCache = villes;
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem(this.cacheKey, JSON.stringify(villes));
        }
      }),
      catchError(() => {
        console.warn('WARNING: Backend indisponible');
        return of([]);
      })
    );
  }

  /** Mapping backend → interface Ville */
  private loadVillesFromBackend(): Observable<Ville[]> {
    return this.http.get<any[]>('/api/villes').pipe(
      map(villes => villes.map(v => ({
        nom: v.nom_ville,
        code: v.code_insee,
        imageUrl: this.toThumbnail(v.url_image),
        lat: v.latitude,
        lng: v.longitude
      })))
    );
  }

  /** Convertit une URL Wikimedia originale en thumbnail 600px */
  private toThumbnail(url: string | null): string {
    if (!url) return '';
    // Déjà un thumbnail
    if (url.includes('/thumb/')) return url;
    // Transformer: /commons/a/ab/File.jpg → /commons/thumb/a/ab/File.jpg/600px-File.jpg
    const match = url.match(/\/wikipedia\/commons\/([a-f0-9]\/[a-f0-9]{2}\/(.+))$/);
    if (match) {
      return url.replace(`/commons/${match[1]}`, `/commons/thumb/${match[1]}/600px-${match[2]}`);
    }
    return url;
  }

  /** Coordonnées d'une ville (cache > corrections > Open-Meteo) */
  getCoordinatesForVille(nomVille: string, codeInsee?: string): Observable<{ lat: number; lng: number }> {
    if (codeInsee) {
      if (this.coordinatesCache[codeInsee]) {
        return of(this.coordinatesCache[codeInsee]);
      }
      if (this.coordinatesFixes[codeInsee]) {
        const coords = this.coordinatesFixes[codeInsee];
        this.coordinatesCache[codeInsee] = coords;
        return of(coords);
      }
    }

    // Fallback: Open-Meteo Geocoding
    const params = { name: nomVille, country: 'France', language: 'fr', limit: '1' };

    return this.http.get<{ results: OpenMeteoGeocodingResult[] }>(this.openMeteoBaseUrl, { params }).pipe(
      map(response => {
        let coords: { lat: number; lng: number };
        if (response.results?.length > 0) {
          const r = response.results[0];
          coords = { lat: r.latitude, lng: r.longitude };
        } else {
          coords = { lat: 46.5, lng: 2.2 }; // Centre France par défaut
        }
        this.coordinatesCache[codeInsee || nomVille] = coords;
        return coords;
      }),
      catchError(() => {
        const fallback = { lat: 46.5, lng: 2.2 };
        this.coordinatesCache[codeInsee || nomVille] = fallback;
        return of(fallback);
      })
    );
  }
}