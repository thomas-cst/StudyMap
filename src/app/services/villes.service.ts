/**
 * Service VillesService
 * Récupère les villes depuis le backend /api/villes (Supabase)
 * Cache en mémoire + localStorage pour éviter les requêtes inutiles
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, catchError, tap } from 'rxjs';

export interface Ville {
  id: number;           // ID Supabase (ville_id)
  id_ville?: number;
  nom: string;
  code: string;        // Code INSEE
  imageUrl: string;    // URL image Wikipedia
  lat?: number;
  lng?: number;
  nb_hab?: number | null;
  nb_etu?: number | null;
  score_transport?: number | null;
  nb_lignes_transport?: number | null;
  nb_arrets_transport?: number | null;
  km_lignes_transport?: number | null;
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

  /** Ensemble des villes situees en outre-mer (exclues des resultats) */
  private villesOutreMer = new Set([
    'Fort-de-France', 'Pointe-à-Pitre', 'Cayenne', 'Saint-Denis', 'Mamoudzou', 'Nouméa', 'Papeete','Dembeni','Punaauia'
  ]);

  /** Ensemble des villes situees en bord de mer */
  private villesMer = new Set(['Brest', 'Lorient', 'Nantes', 'La Rochelle', 'Bordeaux',
    'Bayonne','Montpellier', 'Perpignan', 'Marseille', 'Toulon', 'Nice', 'Aix-en-Provence',
    'Caen', 'Le Havre', 'Rouen', 'Dunkerque','Ajaccio', 'Corte',
  ]);

  /** Ensemble des villes situees en zone montagneuse */
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


  /** Cache des coordonnees GPS deja recuperees (evite les appels API repetitifs) */
  private coordinatesCache: { [key: string]: { lat: number; lng: number } } = {};

  /** Corrections manuelles de coordonnees chargees depuis un fichier JSON */
  private coordinatesFixes: { [key: string]: { lat: number; lng: number } } = {};

  private cacheKey = 'villes_cache_v6';
  private villesCache: Ville[] | null = null;
  /** URL de base de l'API de geocodage Open-Meteo */
  private openMeteoBaseUrl = 'https://geocoding-api.open-meteo.com/v1/search';

  constructor(private http: HttpClient) {
    this.loadCoordinatesFixes();
  }

  /** Charge les corrections manuelles de coordonnées */
  private loadCoordinatesFixes(): void {
    // TODO: Charger depuis assets/city-coordinates-fixes.json si nécessaire
  }


  /** Verifie si une ville est situee en bord de mer */
  isVilleMer(nom: string): boolean {
    return this.villesMer.has(nom);
  }
 
  /** Verifie si une ville est situee en zone montagneuse */
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

  /** Transforme les donnees du backend vers l'interface Ville utilisee cote client */
  private loadVillesFromBackend(): Observable<Ville[]> {
    return this.http.get<any[]>('/api/villes').pipe(
      map(villes => villes.map(v => ({
        id: v.id,
        nom: v.nom_ville,
        code: v.code_insee,
        imageUrl: this.toThumbnail(v.url_image),
        lat: v.latitude,
        lng: v.longitude,
        nb_hab: v.nb_hab ?? null,
        nb_etu: v.nb_etu ?? null,
        score_transport: v.score_transport ?? null,
        nb_lignes_transport: v.nb_lignes_transport ?? null,
        nb_arrets_transport: v.nb_arrets_transport ?? null,
        km_lignes_transport: v.km_lignes_transport ?? null
      })))
    );
  }

  /** Convertit une URL Wikimedia originale en URL de miniature (600px de large) */
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

  /** Recupere les coordonnees GPS d'une ville (cache > corrections manuelles > API Open-Meteo) */
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

  /**
   * Récupère l'ensoleillement moyen du dernier mois complet pour une ville via Open-Meteo
   */
  getMonthlySunshine(lat: number, lng: number): Observable<number> {
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth();
    if (month === 0) {
      month = 12;
      year--;
    }
    const start = new Date(year, month - 1, 1); // premier jour du mois précédent
    const end = new Date(year, month, 0); // dernier jour du mois précédent
    const start_date = start.toISOString().slice(0, 10);
    const end_date = end.toISOString().slice(0, 10);
    const url = 'https://archive-api.open-meteo.com/v1/archive';
    const params = {
      latitude: lat,
      longitude: lng,
      start_date,
      end_date,
      hourly: 'sunshine_duration',
      timezone: 'Europe/Paris'
    };
    return this.http.get<any>(url, { params }).pipe(
      map(data => {
        if (!data.hourly || !data.hourly.sunshine_duration) return 0;
        const totalSeconds = data.hourly.sunshine_duration.reduce((sum: number, val: number) => sum + (val || 0), 0);
        return Math.round(totalSeconds / 3600); // Convertit en heures
      }),
      catchError(() => of(0))
    );
  }

  // Récupère le loyer moyen d'une ville (prix/m²)
  getLoyerMoyen(nomVille: string, codeInsee?: string): Observable<number|null> {
    let url = `/api/loyer/${encodeURIComponent(nomVille)}`;
    if (codeInsee) {
      url += `?code_insee=${encodeURIComponent(codeInsee)}`;
    }
    return this.http.get<{ loyer_m2: number }>(url).pipe(
      map(res => res.loyer_m2 ?? null),
      catchError(() => of(null))
    );
  }

  /**
   * Récupère le nombre de lieux festifs pour une ville
   */
  getLieuxFestifs(nomVille: string): Observable<number> {
    let params: any = {};
    const ville = this.villesCache?.find(v => v.nom === nomVille);
    if (ville && ville.lat !== undefined && ville.lng !== undefined) {
      params.lat = ville.lat;
      params.lng = ville.lng;
    }
    return this.http.get<{ lieux_festifs: number }>(`/api/lieux-festifs/${encodeURIComponent(nomVille)}`, { params })
      .pipe(
        map(res => res.lieux_festifs ?? 0),
        catchError(() => of(0))
      );
  }
}