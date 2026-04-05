/**
 * Service Loyer permet de récupérer le loyer mensuel pour une ville donné selon la surface du logement
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class LoyerService {

  /** Surfaces types par logement (en m²) */
  private readonly SURFACES = { studio: 30, t2: 45, t3: 68};

  constructor(private http: HttpClient) {}

  /**
   * Retourne le loyer mensuel estimé pour une ville (studio, T2, T3).
   */
  getLoyerVille(nomVille: string): Observable<{ studio?: number, t2?: number, t3?: number }> {
    return this.http.get<{ loyer_m2: number }>(
      `/api/loyer/${encodeURIComponent(nomVille)}`
    ).pipe(
      map(res => {
        if (!res || res.loyer_m2 == null) return {};
        const m2 = res.loyer_m2;
        console.log(`[LoyerService] loyer_m2 reçu pour ${nomVille} :`, m2); // LOG DIAGNOSTIC
        return {
          studio: Math.round(m2 * this.SURFACES.studio),
          t2:     Math.round(m2 * this.SURFACES.t2),
          t3:     Math.round(m2 * this.SURFACES.t3),
        };
      }),
      catchError(() => of({}))
    );
  }
}