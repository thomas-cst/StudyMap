import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/** Donnees d'emploi pour une ville universitaire */
export interface VilleEmploi {
  /** Nom de la ville */
  ville: string;
  /** Nombre d'offres d'emploi relevees dans la commune */
  nbobs_com: number;
  /** Indique si la ville est consideree attractive (plus de 5000 offres) */
  attractif: boolean;
}

/**
 * Service EmploiService - Recupere le classement des villes par offres d'emploi
 * Les donnees proviennent de l'API France Travail via le backend (cache 24h).
 */
@Injectable({ providedIn: 'root' })
export class EmploiService {
  private apiUrl = '/api/emploi';

  constructor(private http: HttpClient) {}

  /**
   * Retourne la liste des villes triées par taux d'emploi
   */
  getClassementEmploi(): Observable<VilleEmploi[]> {
    return this.http.get<VilleEmploi[]>(this.apiUrl);
  }
}
