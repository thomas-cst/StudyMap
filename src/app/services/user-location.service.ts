import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface UserLocation {
  lat: number;
  lng: number;
}

@Injectable({ providedIn: 'root' })
export class UserLocationService {
  private static readonly CACHE_KEY = 'user_location_cache_v1';

  private locationSubject = new BehaviorSubject<UserLocation | null>(null);
  private errorSubject = new BehaviorSubject<string | null>(null);
  private askedOnce = false;

  constructor() {
    // Charger la position depuis le cache au démarrage
    const cached = localStorage.getItem(UserLocationService.CACHE_KEY);
    if (cached) {
      try {
        const loc = JSON.parse(cached);
        if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
          this.locationSubject.next(loc);
        }
      } catch {}
    }
  }

  /** Observable de la position utilisateur */
  get location$(): Observable<UserLocation | null> {
    return this.locationSubject.asObservable();
  }

  /** Observable de l'erreur de géolocalisation */
  get error$(): Observable<string | null> {
    return this.errorSubject.asObservable();
  }

  /** Demande la position utilisateur (force = relance même si refusée avant) */
  requestLocation(force = false) {
    if (!navigator.geolocation) {
      this.errorSubject.next("La géolocalisation n'est pas supportée par ce navigateur.");
      return;
    }
    if (!force && this.askedOnce && this.locationSubject.value === null) {
      // Ne pas redemander si déjà refusé et pas de relance explicite
      return;
    }
    this.askedOnce = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        this.locationSubject.next(loc);
        this.errorSubject.next(null);
        localStorage.setItem(UserLocationService.CACHE_KEY, JSON.stringify(loc));
      },
      (err) => {
        this.locationSubject.next(null);
        if (err.code === 1) {
          this.errorSubject.next("Vous devez autoriser la géolocalisation pour utiliser cette fonctionnalité.");
        } else {
          this.errorSubject.next("Erreur lors de la récupération de la position.");
        }
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }

  /** Efface la position utilisateur du cache */
  clearCache() {
    localStorage.removeItem(UserLocationService.CACHE_KEY);
    this.locationSubject.next(null);
  }
}
