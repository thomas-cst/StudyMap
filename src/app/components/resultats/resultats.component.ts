import { Component, input,Input, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FavorisService } from '../../services/favoris.service';

interface Ville {
  nom: string;
  imageUrl: string;
  lat : number;
  lng : number;
}

@Component({
  selector: 'app-resultats', 
  standalone: true,        
  imports: [CommonModule],            
  templateUrl: './resultats.component.html',
  styleUrl: './resultats.component.scss'
})
export class ResultatsComponent {
  /** nom de la ville recherchée */
  @Input() query = '';

  filtreActuel = input<string>('');

  /** inject le service favoris */
  private favorisService = inject(FavorisService);

  /** données factices par défaut */
  private villes = signal<Ville[]>([
    {
      nom: 'Paris',
      imageUrl: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=500&q=60',
      lat: 48.8566,lng: 2.3522
    },
    {
      nom: 'Lyon',
      imageUrl: 'https://images.unsplash.com/photo-1563514755191-496aee4f699d?auto=format&fit=crop&w=500&q=60',
      lat: 45.7640, lng: 4.8357
    },
    {
      nom: 'Rennes',
      imageUrl: 'https://images.unsplash.com/photo-1566336306233-14541bf7fb79?auto=format&fit=crop&w=500&q=60',
      lat: 48.1173, lng: -1.6778
    },
    {
      nom: 'Le Mans',
      imageUrl: 'https://images.unsplash.com/photo-1621648239021-825529f7ce18?auto=format&fit=crop&w=500&q=60',
      lat: 48.0061, lng: 0.1996
    }
  ]);

  /** expose le service pour les tests */
  get favoris() {
    return this.favorisService.favoris;
  }

  /** détail de la ville affichée dans le modal */
  detailVille = signal<Ville | null>(null);

  /** villes filtrées en fonction de la requête */
  filtered = computed(() => {
    let list = [...this.villes()];
    const currentFiltre = this.filtreActuel(); 
    console.log("Valeur détectée dans le computed :", currentFiltre);
    
    //filtrer par nom (dans la barre de recherche)
    const q = this.query.trim().toLowerCase();
    if (q) {
      list = list.filter(v => v.nom.toLowerCase().includes(q));
    }

    //filtre "Autour de moi"
    if (currentFiltre.startsWith('geo:')) {
      const [lat, lng] = currentFiltre.replace('geo:', '').split(',').map(Number);
      
      return list.sort((a, b) => {
        const distA = this.getDistance(lat, lng, a.lat, a.lng);
        const distB = this.getDistance(lat, lng, b.lat, b.lng);
        return distA - distB;
      });
    }
    return list;

  });

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

  // calcule la distance entre deux coordonnées
  private getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
      const R = 6371; // Rayon de la terre
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
  }
}