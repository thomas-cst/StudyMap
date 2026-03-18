import { Component, Input, computed, signal, inject, effect, OnChanges, SimpleChanges, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FavorisService } from '../../services/favoris.service';
import { VillesService, Ville } from '../../services/villes.service';
import { MapSyncService } from '../../services/map-sync.service';
import { SearchSyncService } from '../../services/search-sync.service';

@Component({
  selector: 'app-favoris-display', 
  standalone: true,        
  imports: [CommonModule],            
  templateUrl: './favoris-display.component.html',
  styleUrl: './favoris-display.component.scss'
})
export class FavorisDisplayComponent implements OnChanges, OnInit {
  @Input() query = '';

  /** signal local pour tracker la query */
  private querySignal = signal('');

  private favorisService = inject(FavorisService);
  private villesService = inject(VillesService);
  private mapSyncService = inject(MapSyncService);
  private searchSyncService = inject(SearchSyncService);

  /** destroy ref pour nettoyer les subscriptions */
  private destroyRef = inject(DestroyRef);

  /** données des villes chargées dynamiquement */
  private villes = signal<Ville[]>([]);

  /** loading state */
  isLoading = signal(true);

  /** ville agrandie dans la grille */
  expandedVille = signal<Ville | null>(null);

  /** track la dernière ville zoomée pour éviter les appels API dupliqués */
  private lastZoomedVille = signal<string | null>(null);

  /** track si la dernière sélection était manuelle (clic) ou via la recherche */
  private isManualSelection = signal<boolean>(false);

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
        // Fallback
        this.villes.set([]);
      }
    });
  }
  /** auto-expand celui qui match la recherche */
  constructor() {
    effect(() => {
      const q = this.querySignal().trim().toLowerCase();
      const isManual = this.isManualSelection();
      
      // Si requête est vide et pas de sélection manuelle, fermer
      if (!q && !isManual) {
        this.expandedVille.set(null);
        return;
      }
      
      // Si sélection manuelle ET la query change (changement de recherche), ignorer la recherche
      if (isManual && q) {
        return; // Garder la sélection manuelle, ignorer la recherche
      }
      
      // Logique de recherche (seulement si pas de sélection manuelle)
      if (!isManual && q) {
        const matching = this.filtered().find(v => v.nom.toLowerCase().includes(q));
        if (matching && matching.code !== this.expandedVille()?.code) {
          this.expandedVille.set(matching);
          this.lastZoomedVille.set(matching.code);
          this.expandAndZoom(matching);
        }
      }
    });
  }

  /** sync les changements d'Input avec le signal local */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['query']) {
      this.querySignal.set(this.query);
      // Réinitialiser la sélection manuelle quand la requête change (permet à la recherche de fonctionner)
      this.isManualSelection.set(false);
    }
  }

  /** affiche les favoris filtrés par query */
  filtered = computed(() => {
    const fav = this.villes().filter(v => this.favorisService.isFavoris(v.nom));
    const q = this.querySignal().trim().toLowerCase();
    const recent = this.mapSyncService.recentlyViewed();
    
    let result = fav;
    if (q) {
      result = fav.filter(v => v.nom.toLowerCase().includes(q));
    }
    
    // Trier: d'abord les villes récemment consultées, puis le reste
    if (recent.length === 0) return result;
    
    // Créer un Map pour des lookups O(1) des codes INSEE
    const recentMap = new Map(recent.map((code, i) => [code, i]));
    
    // Trier sans muter l'array original
    return [...result].sort((a, b) => {
      const aIndex = recentMap.get(a.code);
      const bIndex = recentMap.get(b.code);
      
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

  /** toggle une ville en favoris */
  toggleFavoris(nom: string) {
    this.favorisService.toggleFavoris(nom);
  }

  /** check si une ville est en favoris */
  isFavoris(nom: string): boolean {
    return this.favorisService.isFavoris(nom);
  }

  /** Méthode commune pour expand + zoom */
  private expandAndZoom(ville: Ville) {
    // Remonter vers la liste des favoris (chercher l'élément avec classe 'favoris-display')
    // Utiliser un délai pour laisser le DOM se mettre à jour
    setTimeout(() => {
      const favorisElement = document.querySelector('.favoris-display');
      if (favorisElement) {
        favorisElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 100);
    
    // Ajouter aux récemment consultées (utiliser le code INSEE pour fiabilité)
    this.mapSyncService.addToRecentlyViewed(ville.code);
    
    // Si les coordonnées sont en cache, zoomer directement
    if (ville.lat !== undefined && ville.lng !== undefined) {
      this.mapSyncService.zoomToVille(ville.nom, ville.lat, ville.lng);
    } else {
      // Sinon, récupérer les coordonnées via le code INSEE
      console.log(`INFO: Récupération coordonnées pour ${ville.nom}`);
      this.villesService.getCoordinatesForVille(ville.nom, ville.code)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(coords => {
          console.log(`INFO: Zoom vers ${ville.nom}`);
          this.mapSyncService.zoomToVille(ville.nom, coords.lat, coords.lng);
        });
    }
  }

  /** toggle l'expansion d'une ville */
  toggleExpanded(ville: Ville) {
    if (this.expandedVille()?.code === ville.code) {
      // Fermer la ville
      this.expandedVille.set(null);
      this.isManualSelection.set(false);
      this.querySignal.set(''); // Vider le signal local
      this.searchSyncService.clearSearch(); // Demander au parent de vider l'input
    } else {
      // Ouvrir une nouvelle ville
      this.expandedVille.set(ville);
      this.lastZoomedVille.set(ville.code);
      this.isManualSelection.set(true); // Blocker la recherche d'override la sélection
      this.querySignal.set(''); // Vider le buffer recherche
      this.expandAndZoom(ville);
    }
  }

  /** check si une ville est agrandie */
  isExpanded(ville: Ville): boolean {
    return this.expandedVille()?.code === ville.code;
  }

  /** encode URI pour les URLs */
  encodeURIComponent(str: string): string {
    return encodeURIComponent(str);
  }
}
