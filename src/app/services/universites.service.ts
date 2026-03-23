/**
 * Service UniversitesService
 * Récupère les universités d'une ville depuis le backend
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, catchError, tap } from 'rxjs';

export interface Universite {
  id: number;
  nom: string;
  nb_etu: number | null;
  url_image: string | null;
  lien: string | null;
  ville_nom: string;
}

@Injectable({
  providedIn: 'root'
})
export class UniversitesService {

  private cache: { [villeId: number]: Universite[] } = {};

  constructor(private http: HttpClient) {}

  /** Récupère les universités d'une ville par son ID */
  getByVilleId(villeId: number): Observable<Universite[]> {
    if (this.cache[villeId]) {
      return of(this.cache[villeId]);
    }

    return this.http.get<any[]>(`/api/universites/ville/${villeId}`).pipe(
      map(data => data.map(u => ({
        id: u.id,
        nom: u.nom,
        nb_etu: u.nb_etu,
        url_image: u.url_image,
        lien: u.lien || null,
        ville_nom: u.villes?.nom_ville || ''
      }))),

      tap(unis => this.cache[villeId] = unis),
      catchError(() => of([]))
    );
  }
}
