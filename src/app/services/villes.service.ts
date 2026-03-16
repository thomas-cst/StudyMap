import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, forkJoin, of, switchMap, catchError, concatMap, first, tap, delay } from 'rxjs';

export interface Ville {
  id_ville?: number;
  nom: string;
  imageUrl: string;
  lat?: number;
  lng?: number;
}

interface ApiEtablissement {
  uo_lib: string;
  com_nom: string;
  com_code?: string;
  uai_cd?: string;
  localisation?: {
    type: string;
    coordinates?: [number, number];
  };
}

interface NominatimResult {
  lat: string;
  lon: string;
}

interface WikipediaSummary {
  thumbnail?: {
    source: string;
  };
  coordinates?: {
    lat: number;
    lon: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class VillesService {

  // Villes d'outre-mer à exclure
  private villesOutreMer = new Set([
    'Fort-de-France', 'Pointe-à-Pitre', 'Cayenne', 'Saint-Denis', 'Mamoudzou', 'Nouméa', 'Papeete','Dembeni','Punaauia'
  ]);

  // Cache des coordonnées (vide au départ, se remplit via Wikidata)
  private coordinatesCache: { [key: string]: { lat: number; lng: number } } = {};

  private cacheKey = 'villes_cache';
  private villesCache: Ville[] | null = null;

  constructor(private http: HttpClient) { }

  /**
   * Récupère la liste des villes avec universités via l'API Data ESR
   */
  getVilles(): Observable<Ville[]> {
    if (this.villesCache) {
      return of(this.villesCache);
    }

    // Vérifie si on est côté navigateur
    if (typeof window !== 'undefined' && window.localStorage) {
      const cached = localStorage.getItem(this.cacheKey);
      if (cached) {
        this.villesCache = JSON.parse(cached);
        return of(this.villesCache!);
      }
    }

    return this.loadVillesFromAPI().pipe(
      tap(villes => {
        this.villesCache = villes;
        // Enregistre le cache uniquement côté navigateur
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem(this.cacheKey, JSON.stringify(villes));
        }
      })
    );
  }

  private loadVillesFromAPI(): Observable<Ville[]> {
    const url = 'https://data.enseignementsup-recherche.gouv.fr/api/explore/v2.1/catalog/datasets/fr-esr-principaux-etablissements-enseignement-superieur/records?where=type_d_etablissement%3D%22Universit%C3%A9%22&limit=100';

    return this.http.get<{ results: ApiEtablissement[] }>(url).pipe(
      switchMap(response => {
        // Extraire les villes uniques nettoyées et filtrées
        const villesUniques = new Set<string>();
        response.results.forEach(etab => {
          if (etab.com_nom) {
            const cleaned = etab.com_nom.replace(/\s+\d+(er|e|ème)?$/i, '').trim();
            if (!this.villesOutreMer.has(cleaned)) {
              villesUniques.add(cleaned);
            }
          }
        });

        // Récupérer juste les images (pas les coordonnées au chargement)
        const villesObservables = Array.from(villesUniques).map(ville =>
          this.getImageVille(ville).pipe(
            map(imageUrl => ({ 
              nom: ville, 
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
   * Récupère les coordonnées d'une ville spécifique (appelé au click)
   */
  getCoordinatesForVille(nomVille: string): Observable<{ lat: number; lng: number }> {
    // Vérifier le cache d'abord
    if (this.coordinatesCache[nomVille]) {
      console.log(`✅ Coordonnées en cache pour ${nomVille}`);
      return of(this.coordinatesCache[nomVille]);
    }
    
    // Utiliser l'API Wikidata pour récupérer les coordonnées
    console.log(`🔍 Récupération coordonnées Wikidata pour ${nomVille}...`);
    const url = `https://www.wikidata.org/w/api.php`;
    const params = {
      action: 'wbsearchentities',
      search: nomVille,
      language: 'fr',
      type: 'item',
      format: 'json',
      origin: '*'
    };

    return this.http.get<any>(url, { params }).pipe(
      switchMap(results => {
        if (results.search && results.search.length > 0) {
          // Récupérer les claims de l'entité pour obtenir les coordonnées
          const entityId = results.search[0].id;
          return this.http.get<any>(`https://www.wikidata.org/wiki/Special:EntityData/${entityId}.json`, {
            params: { origin: '*' }
          });
        }
        return of(null);
      }),
      map(entityData => {
        let coords: { lat: number; lng: number };
        
        if (entityData && entityData.entities) {
          const entity = Object.values(entityData.entities)[0] as any;
          const coordClaim = entity.claims?.P625?.[0];
          
          if (coordClaim?.mainsnak?.datavalue?.value) {
            const value = coordClaim.mainsnak.datavalue.value;
            coords = {
              lat: parseFloat(value.latitude),
              lng: parseFloat(value.longitude)
            };
            console.log(`✅ Coordonnées Wikidata trouvées pour ${nomVille}:`, coords);
          } else {
            coords = { lat: 46.5, lng: 2.2 };
            console.warn(`⚠️ Pas de coordonnées géologiques dans Wikidata pour ${nomVille}`);
          }
        } else {
          coords = { lat: 46.5, lng: 2.2 };
          console.warn(`⚠️ Aucune entité Wikidata trouvée pour ${nomVille}`);
        }
        
        // Mettre en cache
        this.coordinatesCache[nomVille] = coords;
        return coords;
      }),
      catchError(error => {
        console.warn(`⚠️ Erreur Wikidata pour ${nomVille}, utilisation du fallback:`, error);
        const fallback = { lat: 46.5, lng: 2.2 };
        this.coordinatesCache[nomVille] = fallback;
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
}