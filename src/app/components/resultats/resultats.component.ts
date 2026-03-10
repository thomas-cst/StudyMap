import { Component, input,Input, computed, signal, inject, effect, OnChanges, SimpleChanges, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FavorisService } from '../../services/favoris.service';
import { VillesService, Ville } from '../../services/villes.service';
import { MapSyncService } from '../../services/map-sync.service';

@Component({
  selector: 'app-resultats', 
  standalone: true,        
  imports: [CommonModule],            
  templateUrl: './resultats.component.html',
  styleUrl: './resultats.component.scss'
})
export class ResultatsComponent implements OnChanges, OnInit {
  /** nom de la ville recherchée */
  @Input() query = '';

  /** signal local pour tracker la query */
  private querySignal = signal('');

  filtreActuel = input<string>('');

  /** inject le service favoris */
  private favorisService = inject(FavorisService);

  /** inject le service villes */
  private villesService = inject(VillesService);

  /** inject le service de sync map */
  private mapSyncService = inject(MapSyncService);

  /** destroy ref pour nettoyer les subscriptions */
  private destroyRef = inject(DestroyRef);

  /** données des villes chargées dynamiquement */
  private villes = signal<Ville[]>([]);

  /** loading state */
  isLoading = signal(true);

  /** expose le service pour les tests */
  get favoris() {
    return this.favorisService.favoris;
  }

  /** ville agrandie dans la grille */
  expandedVille = signal<Ville | null>(null);

  /** track la dernière ville zoomée pour éviter les appels API dupliqués */
  private lastZoomedVille = signal<string | null>(null);

  ngOnInit() {
    this.loadVilles();
  }

  private loadVilles() {
    this.isLoading.set(true);
    this.villesService.getVilles().subscribe({
      next: (villes) => {
        this.villes.set(villes);
        this.isLoading.set(false);

        villes.forEach(ville => {
          if (ville.lat === undefined) {
            this.villesService.getCoordinatesForVille(ville.nom)
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe(coords => {
                this.villes.update(currentVilles => 
                  currentVilles.map(v => v.nom === ville.nom ? { ...v, lat: coords.lat, lng: coords.lng } : v)
                );
              });
          }
        });

      },
      error: (err) => {
        console.error('Erreur lors du chargement des villes:', err);
        this.isLoading.set(false);
        // Fallback to some default villes if API fails
        this.villes.set([
          { nom: 'Paris', imageUrl: 'https://www.okvoyage.com/wp-content/uploads/2023/10/Paris-en-photos-scaled.jpg',lat: 48.8566, lng: 2.3522 },
          { nom: 'Lyon', imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTim-y5IcrE4tmZFz2wzjL6jHqjTX5ZjsxrDw&s',lat: 45.7640, lng: 4.8357 }
        ]);
      }
    });
  }

  /** auto-expand celle qui match la recherche */
  constructor() {
    effect(() => {
      const q = this.querySignal().trim().toLowerCase();
      if (!q) {
        this.expandedVille.set(null);
      } else {
        const matching = this.villes().find(v => v.nom.toLowerCase().includes(q));
        if (matching) {
          // Si la ville trouvée est DIFFÉRENTE de la dernière zoomée, on zoom
          if (this.lastZoomedVille() !== matching.nom) {
            this.expandedVille.set(matching);
            this.lastZoomedVille.set(matching.nom);
            this.expandAndZoom(matching);
          }
        } else {
          this.expandedVille.set(null);
        }
      }
    });
  }

  /** sync les changements d'Input avec le signal local */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['query']) {
      this.querySignal.set(this.query);
    }
  }

  /** affiche TOUTES les villes */
 filtered = computed(() => {
    let list = [...this.villes()];
    const currentFiltre = this.filtreActuel();
    const q = this.querySignal().trim().toLowerCase();

    // Filtrer par nom (Barre de recherche)
    if (q) {
      list = list.filter(v => v.nom.toLowerCase().includes(q));
    }

    // Filtre "Autour de moi" 
   if (currentFiltre.startsWith('geo:')) {
      const [lat, lng] = currentFiltre.replace('geo:', '').split(',').map(Number);
      
      // On ne trie que les villes qui ont des coordonnées valides
      return list
        .filter(v => v.lat !== undefined && v.lng !== undefined)
        .sort((a, b) => {
          const distA = this.getDistance(lat, lng, a.lat!, a.lng!);
          const distB = this.getDistance(lat, lng, b.lat!, b.lng!);
          return distA - distB;
        });
    }
    // Si on a pas accès aux données de géoloc -> trier par consultés récemment
    else {
      const recent = this.mapSyncService.recentlyViewed();
      if (recent.length > 0) {
        const recentMap = new Map(recent.map((v, i) => [v, i]));
        list.sort((a, b) => {
          const aIndex = recentMap.get(a.nom);
          const bIndex = recentMap.get(b.nom);
          if (aIndex !== undefined && bIndex === undefined) return -1;
          if (aIndex === undefined && bIndex !== undefined) return 1;
          if (aIndex !== undefined && bIndex !== undefined) return aIndex - bIndex;
          return 0;
        });
      }
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

  /** encode URI pour les URLs */
  encodeURIComponent(str: string): string {
    return encodeURIComponent(str);
  }

  /** Méthode commune pour expand + zoom */
  private expandAndZoom(ville: Ville) {
    // Ajouter aux récemment consultées
    this.mapSyncService.addToRecentlyViewed(ville.nom);
    
    // Si les coordonnées sont en cache, zoomer directement
    if (ville.lat !== undefined && ville.lng !== undefined) {
      this.mapSyncService.zoomToVille(ville.nom, ville.lat, ville.lng);
    } else {
      // Sinon, récupérer les coordonnées
      console.log(`📍 Récupération coordonnées pour ${ville.nom}`);
      this.villesService.getCoordinatesForVille(ville.nom)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(coords => {
          console.log(`🗺️ Zoom vers ${ville.nom}:`, coords);
          this.villes.update(villes => 
            villes.map(v => v.nom === ville.nom ? { ...v, lat: coords.lat, lng: coords.lng } : v)
          );
          this.mapSyncService.zoomToVille(ville.nom, coords.lat, coords.lng);
        });
    }
  }

  /** toggle l'expansion d'une ville */
  toggleExpanded(ville: Ville) {
    if (this.expandedVille()?.nom === ville.nom) {
      this.expandedVille.set(null);
    } else {
      this.expandedVille.set(ville);
      this.lastZoomedVille.set(ville.nom);
      this.expandAndZoom(ville);
    }
  }

  /** check si une ville est agrandie */
  isExpanded(ville: Ville): boolean {
    return this.expandedVille()?.nom === ville.nom;
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