/**
 * Service MeteoService - Recupere les previsions meteorologiques via l'API Open-Meteo
 * Fournit les donnees de temperature et code meteo pour les 7 prochains jours.
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MeteoService {
  private apiUrl = 'https://api.open-meteo.com/v1/forecast';

  constructor(private http: HttpClient) {}

  /**
   * Previsions meteo journalieres pour les 7 prochains jours
   * @param lat - Latitude de la ville
   * @param lon - Longitude de la ville
   * @returns Observable avec temperature max/min et code meteo par jour
   */
  getMeteoSemaine(lat: number, lon: number): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}?latitude=${lat}&longitude=${lon}` +
      `&daily=temperature_2m_max,temperature_2m_min,weathercode&forecast_days=7&timezone=Europe%2FParis`
    );
  }
}
