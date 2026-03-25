import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ItineraireService {
  private readonly apiKey = (window as any)["ORS_API_KEY"] || '';
  private readonly apiUrl = 'http://localhost:3000/api/travel-time';

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
        'Content-Type': 'application/json'  // plus besoin d'Authorization ici, c'est le back qui gère
    });

    return this.http.post<{ distance: number; duration: number }>(this.apiUrl, body, { headers });
    }
}
