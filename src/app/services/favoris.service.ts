/**
 * Service Favoris - Gere les villes favorites de l'utilisateur
 * 
 * Fonctionnalites :
 * - Chargement des favoris depuis le serveur backend
 * - Ajout et suppression de favoris via l'API
 * - Signal reactif pour que les composants reagissent aux changements
 * - Verification si une ville est en favoris
 */
import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Ville } from './villes.service';

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

  constructor() {
    // Ne charger les favoris que côté client
    if (isPlatformBrowser(this.platformId)) {
      this.loadFavoris();
    }
  }

  /** Recupere l'identifiant de l'utilisateur connecte depuis le localStorage */
  private getUserId(): number | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    
    const user = localStorage.getItem('user');
    if (!user) return null;
    try {
      const userData = JSON.parse(user);
      return userData.id || userData.id_user;
    } catch {
      return null;
    }
  }

  /** Charge la liste des favoris depuis le serveur pour l'utilisateur connecte */
  private loadFavoris() {
    const userId = this.getUserId();
    if (!userId) {
      console.log('User non authentifié, pas de favoris à charger');
      return;
    }

    this.http.get<{ favoris: Ville[] }>(`/api/favorites/${userId}`)
      .subscribe({
        next: (data) => {
          console.log('Favoris chargés:', data.favoris);
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
    const userId = this.getUserId();
    if (!userId) {
      console.error('User non authentifié');
      return;
    }

    this.http.post('/api/favorites/add', {
      id_user: userId,
      nom: ville.nom,
      imageUrl: ville.imageUrl,
      latitude: ville.lat,
      longitude: ville.lng
    }).subscribe({
      next: (response: any) => {
        console.log('Favori ajouté, id_ville:', response.id_ville);
        // Refcharger la liste des favoris
        this.loadFavoris();
      },
      error: (err) => console.error('Erreur ajout favori:', err)
    });
  }

  /** Retire une ville des favoris via l'API */
  removeFavoris(ville: Ville) {
    const userId = this.getUserId();
    if (!userId) return;

    const villeInList = this.favorisSignal().find(v => v.nom === ville.nom);
    const idVille = villeInList?.id_ville || ville.id_ville;

    if (!idVille) {
      console.error('ID ville non trouvé');
      return;
    }

    this.http.delete(`/api/favorites/remove/${userId}/${idVille}`)
      .subscribe({
        next: () => {
          this.favorisSignal.set(this.favorisSignal().filter(v => v.nom !== ville.nom));
        },
        error: (err) => console.error('Erreur suppression favori:', err)
      });
  }

  /** Ajoute ou retire une ville des favoris selon son etat actuel */
  toggleFavoris(ville: Ville) {
    const isFav = this.isFavoris(ville.nom);
    if (isFav) {
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
