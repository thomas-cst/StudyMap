import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MeteoService {
  private apiUrl = 'https://api.open-meteo.com/v1/forecast';

  constructor(private http: HttpClient) {}

  /** Prévisions météo journalières pour la semaine (7 jours) */
  getMeteoSemaine(lat: number, lon: number): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}?latitude=${lat}&longitude=${lon}` +
      `&daily=temperature_2m_max,temperature_2m_min,weathercode&forecast_days=7&timezone=Europe%2FParis`
    );
  }
}
