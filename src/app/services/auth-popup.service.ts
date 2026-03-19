/**
 * Service AuthPopup - Permet aux composants enfants de demander l'ouverture de la popup de connexion
 * 
 * Utilise un signal reactif pour communiquer entre les composants profonds
 * (resultats, favoris-display) et le composant racine (app.ts) qui controle la popup
 */
import { Injectable } from '@angular/core';
import { signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthPopupService {
  /** Signal indiquant qu'une demande d'ouverture de la popup de connexion a ete faite */
  private _loginRequested = signal(false);

  /** Signal en lecture seule expose aux composants */
  loginRequested = this._loginRequested.asReadonly();

  /** Demande l'ouverture de la popup de connexion */
  requestLogin() {
    this._loginRequested.set(true);
  }

  /** Reinitialise la demande apres traitement par le composant racine */
  dismiss() {
    this._loginRequested.set(false);
  }
}
