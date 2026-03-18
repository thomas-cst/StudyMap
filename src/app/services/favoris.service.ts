import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Ville } from './villes.service';

@Injectable({
  providedIn: 'root'
})
export class FavorisService {
  /** liste des villes en favoris */
  private favorisSignal = signal<Ville[]>([]);
  favoris = this.favorisSignal.asReadonly();

  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);

  constructor() {
    // Ne charger les favoris que côté client
    if (isPlatformBrowser(this.platformId)) {
      this.loadFavoris();
    }
  }

  /** Récupérer l'ID utilisateur depuis localStorage */
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

  /** Charger les favoris depuis le serveur */
  private loadFavoris() {
    const userId = this.getUserId();
    if (!userId) {
      console.log('User non authentifié, pas de favoris à charger');
      return;
    }

    this.http.get<{ favoris: Ville[] }>(`http://localhost:3000/api/favorites/${userId}`)
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

  /** Ajouter un favori */
  addFavoris(ville: Ville) {
    const userId = this.getUserId();
    if (!userId) {
      console.error('User non authentifié');
      return;
    }

    this.http.post('http://localhost:3000/api/favorites/add', {
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

  /** Retirer un favori */
  removeFavoris(ville: Ville) {
    const userId = this.getUserId();
    if (!userId) return;

    const villeInList = this.favorisSignal().find(v => v.nom === ville.nom);
    const idVille = villeInList?.id_ville || ville.id_ville;

    if (!idVille) {
      console.error('ID ville non trouvé');
      return;
    }

    this.http.delete(`http://localhost:3000/api/favorites/remove/${userId}/${idVille}`)
      .subscribe({
        next: () => {
          this.favorisSignal.set(this.favorisSignal().filter(v => v.nom !== ville.nom));
        },
        error: (err) => console.error('Erreur suppression favori:', err)
      });
  }

  /** Toggle favori */
  toggleFavoris(ville: Ville) {
    const isFav = this.isFavoris(ville.nom);
    if (isFav) {
      this.removeFavoris(ville);
    } else {
      this.addFavoris(ville);
    }
  }

  /** Vérifier si une ville est en favoris */
  isFavoris(nom: string): boolean {
    return this.favorisSignal().some(v => v.nom === nom);
  }

  /** Recharger les favoris */
  refresh() {
    this.loadFavoris();
  }
}
