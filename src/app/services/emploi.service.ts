import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface VilleEmploi {
  ville: string;
  nbobs_com: number;
  attractif: boolean;
}

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
