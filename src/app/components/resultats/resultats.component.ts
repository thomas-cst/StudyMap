<<<<<<< HEAD
import { Component, Input, computed, signal, inject, effect, OnChanges, SimpleChanges, OnInit, DestroyRef } from '@angular/core';
=======
import { Component, Input, computed, signal, inject } from '@angular/core';
>>>>>>> d97f9a81c81be0bc3364f8a8a7484b9b2bddd790
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FavorisService } from '../../services/favoris.service';
<<<<<<< HEAD
import { VillesService, Ville } from '../../services/villes.service';
import { MapSyncService } from '../../services/map-sync.service';
=======

interface Ville {
  nom: string;
  imageUrl: string;
}
>>>>>>> d97f9a81c81be0bc3364f8a8a7484b9b2bddd790

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
      },
      error: (err) => {
        console.error('Erreur lors du chargement des villes:', err);
        this.isLoading.set(false);
        // Fallback to some default villes if API fails
        this.villes.set([
          { nom: 'Paris', imageUrl: 'https://www.okvoyage.com/wp-content/uploads/2023/10/Paris-en-photos-scaled.jpg' },
          { nom: 'Lyon', imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTim-y5IcrE4tmZFz2wzjL6jHqjTX5ZjsxrDw&s' }
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
    const all = this.villes();
    const recent = this.mapSyncService.recentlyViewed();
    
    if (recent.length === 0) return all;
    
    // Créer un Map pour des lookups O(1) au lieu de O(n)
    const recentMap = new Map(recent.map((v, i) => [v, i]));
    
    // Trier sans muter l'array original
    return [...all].sort((a, b) => {
      const aIndex = recentMap.get(a.nom);
      const bIndex = recentMap.get(b.nom);
      
      const aIsRecent = aIndex !== undefined;
      const bIsRecent = bIndex !== undefined;
      
      if (aIsRecent && !bIsRecent) return -1;
      if (!aIsRecent && bIsRecent) return 1;
      
      // Si les deux sont récentes, garder l'ordre de recentlyViewed
      if (aIsRecent && bIsRecent) {
        return aIndex! - bIndex!;
      }
      
      return 0;
    });
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
}