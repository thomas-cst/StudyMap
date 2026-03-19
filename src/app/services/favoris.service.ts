/**
 * Service Favoris - Gere les villes favorites de l'utilisateur
 * 
 * Fonctionnalites :
 * - Chargement des favoris depuis le serveur backend (Supabase)
 * - Ajout et suppression de favoris via l'API
 * - Signal reactif pour que les composants reagissent aux changements
 * - Rechargement automatique des favoris a la connexion de l'utilisateur
 * - Verification si une ville est en favoris
 */
import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Ville } from './villes.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class FavorisService {
  /** Signal contenant la liste des villes en favoris */
  private favorisSignal = signal<Ville[]>([]);
  /** Signal en lecture seule expose aux composants */
  favoris = this.favorisSignal.asReadonly();

  /** Client HTTP pour les appels API */
  private http = inject(HttpClient);
  /** Identifiant de la plateforme (navigateur ou serveur) */
  private platformId = inject(PLATFORM_ID);
  /** Service d'authentification pour recuperer l'utilisateur connecte */
  private authService = inject(AuthService);

  constructor() {
    // Ne charger les favoris que cote client
    if (isPlatformBrowser(this.platformId)) {
      // Ecouter les changements d'authentification
      // Quand l'utilisateur se connecte -> charger ses favoris
      // Quand il se deconnecte -> vider la liste
      this.authService.currentUser$.subscribe(user => {
        if (user) {
          this.loadFavoris();
        } else {
          this.favorisSignal.set([]);
        }
      });
    }
  }

  /**
   * Recupere l'email de l'utilisateur connecte via AuthService
   * L'email sert d'identifiant pour les appels API favoris
   * Retourne null si l'utilisateur n'est pas connecte
   */
  private getUserEmail(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    const user = this.authService.getCurrentUser();
    return user?.email || null;
  }

  /** Charge la liste des favoris depuis le serveur pour l'utilisateur connecte */
  private loadFavoris() {
    const email = this.getUserEmail();
    if (!email) {
      this.favorisSignal.set([]);
      return;
    }

    this.http.get<{ favoris: Ville[] }>(`/api/favorites/${encodeURIComponent(email)}`)
      .subscribe({
        next: (data) => {
          console.log('Favoris charges:', data.favoris);
          this.favorisSignal.set(data.favoris);
        },
        error: (err) => {
          console.error('Erreur chargement favoris:', err);
          this.favorisSignal.set([]);
        }
      });
  }

  /** Ajoute une ville aux favoris via l'API puis recharge la liste */
  addFavoris(ville: Ville) {
    const email = this.getUserEmail();
    if (!email) {
      console.error('Utilisateur non authentifie');
      return;
    }

    this.http.post('/api/favorites/add', {
      email: email,
      nom_ville: ville.nom
    }).subscribe({
      next: (response: any) => {
        console.log('Favori ajoute:', ville.nom);
        // Recharger la liste complete des favoris
        this.loadFavoris();
      },
      error: (err) => console.error('Erreur ajout favori:', err)
    });
  }

  /** Retire une ville des favoris via l'API */
  removeFavoris(ville: Ville) {
    const email = this.getUserEmail();
    if (!email) return;

    // Encoder l'email et le nom de la ville pour l'URL
    const encodedEmail = encodeURIComponent(email);
    const encodedNom = encodeURIComponent(ville.nom);

    this.http.delete(`/api/favorites/remove/${encodedEmail}/${encodedNom}`)
      .subscribe({
        next: () => {
          // Mettre a jour le signal localement pour un retour immediat
          this.favorisSignal.set(this.favorisSignal().filter(v => v.nom !== ville.nom));
        },
        error: (err) => console.error('Erreur suppression favori:', err)
      });
  }

  /** Ajoute ou retire une ville des favoris selon son etat actuel */
  toggleFavoris(ville: Ville) {
    if (this.isFavoris(ville.nom)) {
      this.removeFavoris(ville);
    } else {
      this.addFavoris(ville);
    }
  }

  /** Verifie si une ville est dans la liste des favoris par son nom */
  isFavoris(nom: string): boolean {
    return this.favorisSignal().some(v => v.nom === nom);
  }

  /** Force le rechargement des favoris depuis le serveur */
  refresh() {
    this.loadFavoris();
  }
}
