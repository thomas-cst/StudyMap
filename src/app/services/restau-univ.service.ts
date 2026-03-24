import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, catchError, tap } from 'rxjs';

export interface RestaurantUniversitaire {
  id: number;
  nom: string;
  adresse: string | null;
  universite_id: number;
}

@Injectable({
  providedIn: 'root'
})
export class RestauUnivService {
  private cache: { [universiteId: number]: RestaurantUniversitaire[] } = {};

  constructor(private http: HttpClient) {}

  getByUniversiteId(universiteId: number): Observable<RestaurantUniversitaire[]> {
    if (!universiteId) return of([]);
    if (this.cache[universiteId]) {
      return of(this.cache[universiteId]);
    }

    return this.http.get<any[]>(`/api/restau-univ/universite/${universiteId}`).pipe(
      map(data => data.map(item => ({
        id: item.id,
        nom: item.nom,
        adresse: item.adresse || null,
        universite_id: item.universite_id
      }))),
      tap(restaurants => this.cache[universiteId] = restaurants),
      catchError(() => of([]))
    );
  }
}
