import { Component, Input, computed, signal, inject, effect, OnChanges, SimpleChanges, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FavorisService } from '../../services/favoris.service';
import { VillesService, Ville } from '../../services/villes.service';
import { MapSyncService } from '../../services/map-sync.service';
import { SearchSyncService } from '../../services/search-sync.service';

/**
 * Composant ResultatsComponent - Affiche la liste des villes avec filtrage
 * 
 * Responsabilités:
 * - Charger les 48 villes depuis le backend
 * - Filtrer basé sur la barre de recherche
 * - Afficher les villes dans une grille
 * - Marquer les favoris
 * - Synchroniser le zoom de la carte quand on clique une ville
 * 
 * Signaux principaux:
 * - villes: liste complète des 48 villes
 * - querySignal: terme de recherche
 * - isLoading: état du chargement
 */
@Component({
  selector: 'app-resultats', 
  standalone: true,        
  imports: [CommonModule],            
  templateUrl: './resultats.component.html',
  styleUrl: './resultats.component.scss'
})
export class ResultatsComponent implements OnChanges, OnInit {
  /** Terme de recherche passé par le parent AccueilComponent */
  @Input() query = '';

  private querySignal = signal('');
  private favorisService = inject(FavorisService);
  private villesService = inject(VillesService);
  private mapSyncService = inject(MapSyncService);
  private searchSyncService = inject(SearchSyncService);
  private destroyRef = inject(DestroyRef);

  /** Liste complète des villes chargées depuis le backend */
  private villes = signal<Ville[]>([]);

  /** État du chargement initial */
  isLoading = signal(true);

  /** Signal des favoris pour le template */
  get favoris() {
    return this.favorisService.favoris;
  }

  /** Ville actuellement agrandie dans la grille (pour vue détail) */
  expandedVille = signal<Ville | null>(null);

  /** Évite de zoomer deux fois sur la même ville */
  private lastZoomedVille = signal<string | null>(null);

  /** Évite que la recherche n'override une sélection manuelle */
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
        console.error('ERROR: Chargement des villes échoué:', err);
        this.isLoading.set(false);
        this.villes.set([]);
      }
    });
  }

  constructor() {
    // Auto-expand la ville qui match la recherche
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
        const matching = this.villes().find(v => v.nom.toLowerCase().includes(q));
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

  /** affiche TOUTES les villes */
  filtered = computed(() => {
    const all = this.villes();
    const recent = this.mapSyncService.recentlyViewed();
    
    if (recent.length === 0) return all;
    
    // Créer un Map pour des lookups O(1) des codes INSEE au lieu du nom
    const recentMap = new Map(recent.map((code, i) => [code, i]));
    
    // Trier sans muter l'array original
    return [...all].sort((a, b) => {
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
    // Remonter vers la liste des résultats (chercher l'élément avec classe 'resultats')
    // Utiliser un délai pour laisser le DOM se mettre à jour
    setTimeout(() => {
      const resultatsElement = document.querySelector('.resultats');
      if (resultatsElement) {
        resultatsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
}