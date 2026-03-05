import { Injectable } from '@angular/core';
import { signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FavorisService {
  /** liste des villes en favoris (par nom) */
  private favorisSignal = signal<string[]>([]);

  /** getter pour accéder au signal */
  favoris = this.favorisSignal.asReadonly();

  /** toggle une ville en favoris */
  toggleFavoris(nom: string) {
    const current = this.favorisSignal();
    if (current.includes(nom)) {
      this.favorisSignal.set(current.filter(f => f !== nom));
    } else {
      this.favorisSignal.set([...current, nom]);
    }
  }

  /** check si une ville est en favoris */
  isFavoris(nom: string): boolean {
    return this.favorisSignal().includes(nom);
  }

  /** ajouter à favoris */
  addFavoris(nom: string) {
    const current = this.favorisSignal();
    if (!current.includes(nom)) {
      this.favorisSignal.set([...current, nom]);
    }
  }

  /** retirer des favoris */
  removeFavoris(nom: string) {
    const current = this.favorisSignal();
    this.favorisSignal.set(current.filter(f => f !== nom));
  }
}
