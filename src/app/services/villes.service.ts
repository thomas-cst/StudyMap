/**
 * Service VillesService - Gère toutes les villes de StudyMap
 * 
 * Ce service fait le lien entre le frontend Angular et le backend Node.js.
 * Responsabilités:
 * - Récupérer la liste des villes depuis /api/villes
 * - Cacher les données en localStorage (évite relancer la requête)
 * - Fallback vers l'API ESR si le backend ne répond pas
 * - Récupérer les coordonnées exactes de chaque ville
 * 
 * Flux typique:
 * 1. Component appelle getVilles()
 * 2. Service vérifie le cache localStorage
 * 3. Si rien: appelle le backend /api/villes
 * 4. Reçoit les 48 villes avec images
 * 5. Les coords viennent du backend (API ESR)
 * 6. Sauvegarde en localStorage pour prochaine fois
 * 
 * C'est un service RxJS = tout s'appelle avec des Observables
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, forkJoin, of, switchMap, catchError, concatMap, first, tap, delay } from 'rxjs';

/**
 * Interface: une Ville avec ses infos de base
 */
export interface Ville {
  id_ville?: number;
  nom: string;
  code: string;        // Code INSEE (identifiant unique communal français)
  imageUrl: string;    // URL Wikipedia de l'image
  lat?: number;        // Latitude (récupérée du backend)
  lng?: number;        // Longitude (récupérée du backend)
}

/**
 * Interface interne: format brut de l'API ESR (établissements universitaires)
 */
interface ApiEtablissement {
  uo_lib: string;
  com_nom: string;      // Nom de la commune
  com_code?: string;    // Code INSEE de la commune
  uai_cd?: string;
  coordonnees?: {
    lon: number;
    lat: number;
  };
  localisation?: {
    type: string;
    coordinates?: [number, number];
  };
}

/**
 * Interface interne: format Wikipedia (pour images, coordonnées)
 */
interface WikipediaSummary {
  thumbnail?: {
    source: string;
  };
  coordinates?: {
    lat: number;
    lon: number;
  };
}

/**
 * Interface interne: format Open-Meteo Geocoding API
 */
interface OpenMeteoGeocodingResult {
  latitude: number;
  longitude: number;
  name: string;
  admin1: string;      // Région
  country: string;    // Pays
}

/**
 * Interface: données météo (pour utilisation future)
 */
export interface MeteoDonnees {
  temperature: number;
  precipitation: number;
  windSpeed: number;
  weatherCode: number;
}

@Injectable({
  providedIn: 'root'
})
export class VillesService {

  /**
   * Villes d'outre-mer à exclure (décision métier: focus sur métropole)
   */
  private villesOutreMer = new Set([
    'Fort-de-France', 'Pointe-à-Pitre', 'Cayenne', 'Saint-Denis', 'Mamoudzou', 'Nouméa', 'Papeete','Dembeni','Punaauia'
  ]);

  /**
   * Cache des coordonnées en mémoire (rempli lors du premier appel Open-Meteo)
   * Structure: { "codeInsee": { lat: 48.5, lng: 2.3 } }
   */
  private coordinatesCache: { [key: string]: { lat: number; lng: number } } = {};

  /**
   * Corrections manuelles de coordonnées pour cas spéciaux
   * Chargées depuis assets/city-coordinates-fixes.json au démarrage
   */
  private coordinatesFixes: { [key: string]: { lat: number; lng: number } } = {};

  /**
   * Clé du localStorage: change la version quand format change
   * localStorage['villes_cache_v2'] = [villes...]
   */
  private cacheKey = 'villes_cache_v2';
  
  /**
   * Cache en mémoire des villes (plus rapide que localStorage)
   */
  private villesCache: Ville[] | null = null;

  /**
   * URL API pour les coordonnées des villes (gratuit, fiable, sans clé)
   */
  private openMeteoBaseUrl = 'https://geocoding-api.open-meteo.com/v1/search';

  constructor(private http: HttpClient) {
    // Au démarrage: charger les corrections manuelles
    this.loadCoordinateFixes();
  }

  private loadCoordinateFixes() {
    /**
     * Charge les corrections de coordonnées depuis un fichier JSON statique
     * Utilisé pour corriger manuellement les villes où les données API sont mauvaises
     */
    this.http.get<{ [key: string]: { lat: number; lng: number } }>('assets/city-coordinates-fixes.json')
      .subscribe({
        next: (fixes) => {
          this.coordinatesFixes = fixes;
          console.log('SUCCESS: Corrections de coordonnées chargées');
        },
        error: (err) => {
          console.warn('WARNING: Impossible de charger les corrections de coordonnées');
        }
      });
  }

  /**
   * PUBLIC: Récupère la liste de toutes les villes
   * 
   * Stratégie 3 niveaux:
   * - Cache mémoire (instantané)
   * - localStorage (rápide, ~5ms)
   * - Backend /api/villes (réseau, ~70ms sur BD, ~10s sur initialisation)
   * 
   * Retourne: Observable<Ville[]> avec 48 villes + images
   * 
   * @returns Observable avec tableau des villes
   * @example
   *   this.villesService.getVilles().subscribe(villes => {
   *     console.log(villes);  // Array of 48 Ville objects
   *   });
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

    // Appeler le backend (http://localhost:3000/api/villes)
    return this.loadVillesFromBackend().pipe(
      tap(villes => {
        this.villesCache = villes;
        // Enregistre le cache uniquement côté navigateur
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem(this.cacheKey, JSON.stringify(villes));
        }
      }),
      catchError(err => {
        console.warn('WARNING: Fallback API ESR, erreur backend');
        return this.loadVillesFromAPI();
      })
    );
  }

  /**
   * Récupère les villes depuis le backend (BD + fallback)
   */
  private loadVillesFromBackend(): Observable<Ville[]> {
    return this.http.get<any[]>('/api/villes').pipe(
      map(villes => villes.map(v => ({
        nom: v.nom,
        code: v.codeInsee,
        imageUrl: v.imageUrl,
        lat: v.latitude,
        lng: v.longitude
      })))
    );
  }

  /**
   * Fallback: Récupère la liste des villes si backend indisponible
   */
  private loadVillesFromAPI(): Observable<Ville[]> {
    const url = 'https://data.enseignementsup-recherche.gouv.fr/api/explore/v2.1/catalog/datasets/fr-esr-principaux-etablissements-enseignement-superieur/records?where=type_d_etablissement%3D%22Universit%C3%A9%22&limit=100';

    return this.http.get<{ results: ApiEtablissement[] }>(url).pipe(
      switchMap(response => {
        // Extraire les villes uniques avec leur CODE INSEE ET COORDONNÉES
        // Map: code INSEE -> {nom, lat?, lng?} (données de première source trouvée)
        const villesMap = new Map<string, { nom: string; lat?: number; lng?: number }>();
        
        response.results.forEach(etab => {
          if (etab.com_nom && etab.com_code) {
            const cleaned = etab.com_nom.replace(/\s+\d+(er|e|ème)?$/i, '').trim();
            
            // Ignorer outre-mer ET villes déjà trouvées (garder la première occurrence)
            if (!this.villesOutreMer.has(cleaned) && !villesMap.has(etab.com_code)) {
              const vData: { nom: string; lat?: number; lng?: number } = { nom: cleaned };
              
              // Ajouter les coordonnées si disponibles dans l'API
              if (etab.coordonnees) {
                vData.lat = etab.coordonnees.lat;
                vData.lng = etab.coordonnees.lon;
                // Pré-remplir le cache avec les coordonnées de l'API
                this.coordinatesCache[etab.com_code] = { lat: etab.coordonnees.lat, lng: etab.coordonnees.lon };
              } else if (etab.localisation?.coordinates) {
                // Fallback sur localisation si coordonnees n'existe pas
                vData.lat = etab.localisation.coordinates[1];
                vData.lng = etab.localisation.coordinates[0];
                this.coordinatesCache[etab.com_code] = { lat: etab.localisation.coordinates[1], lng: etab.localisation.coordinates[0] };
              }
              
              villesMap.set(etab.com_code, vData);
            }
          }
        });

        // Récupérer les images pour toutes les villes
        const villesObservables = Array.from(villesMap.entries()).map(([code, data]) =>
          this.getImageVille(data.nom).pipe(
            map(imageUrl => ({ 
              nom: data.nom,
              code: code,  // Utiliser code INSEE comme identifiant primaire
              lat: data.lat,
              lng: data.lng,
              imageUrl
            }))
          )
        );

        return forkJoin(villesObservables);
      })
    ).pipe(
      // Filtrer les villes sans image
      map(villes => villes.filter((v: Ville) => v.imageUrl))
    );
  }

  /**
   * Récupère les coordonnées d'une ville via son code INSEE
   * Cherche d'abord en cache (pré-rempli depuis ESR), puis Open-Meteo en dernier recours
   */
  getCoordinatesForVille(nomVille: string, codeInsee?: string): Observable<{ lat: number; lng: number }> {
    // Si on a le code INSEE, l'utiliser comme identifiant primaire
    if (codeInsee) {
      // 1. Vérifier le cache par code INSEE (pré-rempli depuis ESR)
      if (this.coordinatesCache[codeInsee]) {
        console.log(`SUCCESS: Coordonnées en cache pour ${nomVille}`);
        return of(this.coordinatesCache[codeInsee]);
      }

      // 2. Vérifier les corrections d'abord (fallback pour cas exceptionnels)
      if (this.coordinatesFixes[codeInsee]) {
        console.log(`SUCCESS: Correctif de coordonnées appliqué pour ${nomVille}`);
        const coords = this.coordinatesFixes[codeInsee];
        this.coordinatesCache[codeInsee] = coords;
        return of(coords);
      }
    }

    // Fallback: Appel Open-Meteo Geocoding API (si pas de code INSEE ou pas en cache)
    console.log(`INFO: Requête coordonnées pour ${nomVille}`);
    const params = {
      name: nomVille,
      country: 'France', // Limiter à la France pour plus de précision
      language: 'fr',
      limit: '1'
    };

    return this.http.get<{ results: OpenMeteoGeocodingResult[] }>(this.openMeteoBaseUrl, { params }).pipe(
      map(response => {
        let coords: { lat: number; lng: number };
        
        if (response.results && response.results.length > 0) {
          const result = response.results[0];
          coords = {
            lat: result.latitude,
            lng: result.longitude
          };
          console.log(`SUCCESS: Coordonnées trouvées pour ${nomVille}`);
        } else {
          // Fallback: centre de la France
          coords = { lat: 46.5, lng: 2.2 };
          console.warn(`WARNING: Coordonnées non trouvées pour ${nomVille}`);
        }
        
        // Mettre en cache (avec code INSEE si disponible, sinon avec le nom)
        const cacheKey = codeInsee || nomVille;
        this.coordinatesCache[cacheKey] = coords;
        return coords;
      }),
      catchError(error => {
        console.error(`ERROR: Erreur Open-Meteo pour ${nomVille}:`, error);
        const fallback = { lat: 46.5, lng: 2.2 };
        const cacheKey = codeInsee || nomVille;
        this.coordinatesCache[cacheKey] = fallback;
        return of(fallback);
      })
    );
  }

  /**
   * Récupère l'image d'une ville via Wikipedia
   */
  private getImageVille(nomVille: string): Observable<string> {
    // Essayer plusieurs variantes
    const variantes = [
      nomVille,
      `${nomVille} (France)`,
      `${nomVille} (ville)`
    ];

    // Essayer chaque variante jusqu'à en trouver une avec thumbnail
    return of(...variantes).pipe(
      concatMap(variante => this.tryGetImage(variante)),
      first(image => image !== '', '') // Prendre la première non vide, ou '' si aucune
    );
  }

  private tryGetImage(nom: string): Observable<string> {
    const encodedVille = encodeURIComponent(nom);
    const url = `https://fr.wikipedia.org/api/rest_v1/page/summary/${encodedVille}`;

    return this.http.get<WikipediaSummary>(url).pipe(
      map(summary => summary.thumbnail?.source || ''),
      catchError(() => of(''))
    );
  }

  /**
   * Récupère la météo actuelle pour des coordonnées (intégration future)
   * Utilise l'API Open-Meteo Weather
   */
  getMeteo(lat: number, lng: number): Observable<MeteoDonnees> {
    // TODO: Intégrer avec Open-Meteo Weather API
    // Endpoint: https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&current=temperature,precipitation,wind_speed,weather_code
    
    // Pour l'instant, retourner des données par défaut
    return of({
      temperature: 0,
      precipitation: 0,
      windSpeed: 0,
      weatherCode: 0
    });
  }
}