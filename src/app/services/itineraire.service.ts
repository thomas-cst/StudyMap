import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ItineraireService {
  private readonly apiKey = (window as any)["ORS_API_KEY"] || '';
  private readonly apiUrl = 'https://api.openrouteservice.org/v2/directions/driving-car';

  constructor(private http: HttpClient) {}

  /**
   * Calcule l'itinéraire voiture entre deux points (lat/lng)
   * Retourne un Observable avec { distance: km, duration: min }
   */
  getItineraire(
    from: { lat: number; lng: number },
    to: { lat: number; lng: number }
  ): Observable<{ distance: number; duration: number }> {
    const body = {
      coordinates: [
        [from.lng, from.lat],
        [to.lng, to.lat]
      ]
    };
    const headers = new HttpHeaders({
      'Authorization': this.apiKey,
      'Content-Type': 'application/json'
    });
    return this.http.post<any>(this.apiUrl, body, { headers }).pipe(
      map(res => {
        const summary = res?.features?.[0]?.properties?.summary;
        return {
          distance: summary ? Math.round(summary.distance / 100) / 10 : null, // km
          duration: summary ? Math.round(summary.duration / 60) : null // min
        };
      })
    );
  }
}
