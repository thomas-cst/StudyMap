import { Component, computed, signal, inject,Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FavorisService } from '../../services/favoris.service';

interface Ville {
  nom: string;
  imageUrl: string;
}

@Component({
  selector: 'app-favoris-display', 
  standalone: true,        
  imports: [CommonModule],            
  templateUrl: './favoris-display.component.html',
  styleUrl: './favoris-display.component.scss'
})
export class FavorisDisplayComponent {
  @Input() filtreActuel = '';

  private favorisService = inject(FavorisService);

  /** données factices par défaut */
  private villes = signal<Ville[]>([
    {
      nom: 'Paris',
      imageUrl: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=500&q=60'
    },
    {
      nom: 'Lyon',
      imageUrl: 'https://images.unsplash.com/photo-1563514755191-496aee4f699d?auto=format&fit=crop&w=500&q=60'
    },
    {
      nom: 'Rennes',
      imageUrl: 'https://images.unsplash.com/photo-1566336306233-14541bf7fb79?auto=format&fit=crop&w=500&q=60'
    },
    {
      nom: 'Le Mans',
      imageUrl: 'https://images.unsplash.com/photo-1621648239021-825529f7ce18?auto=format&fit=crop&w=500&q=60'
    }
  ]);

  /** détail de la ville affichée dans le modal */
  detailVille = signal<Ville | null>(null);

  /** villes uniquement dans les favoris */
  favorisFiltered = computed(() => {
    return this.villes().filter(v => this.favorisService.isFavoris(v.nom));
  });

  /** toggle une ville en favoris */
  toggleFavoris(nom: string) {
    this.favorisService.toggleFavoris(nom);
  }

  /** check si une ville est en favoris */
  isFavoris(nom: string): boolean {
    return this.favorisService.isFavoris(nom);
  }

  /** affiche les détails d'une ville */
  showDetails(ville: Ville) {
    this.detailVille.set(ville);
  }

  /** ferme le modal de détails */
  closeDetails() {
    this.detailVille.set(null);
  }
}
