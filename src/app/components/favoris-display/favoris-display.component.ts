/**
 * Composant FavorisDisplay - Affiche la liste des villes favorites de l'utilisateur
 * 
 * Fonctionnalites :
 * - Affichage des favoris avec filtrage par recherche
 * - Tri par villes recemment consultees
 * - Expansion d'une ville pour voir ses details et zoomer sur la carte
 * - Gestion des favoris (ajout/suppression)
 */
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
  /** Terme de recherche recu depuis le composant parent */
  @Input() query = '';

  /** Signal local qui synchronise la valeur de l'Input query pour une utilisation reactive */
  private querySignal = signal('');

  /** Filtre actuellement selectionne (recu du composant parent) */
  @Input() filtreActuel = '';

  /** Service de gestion des favoris (ajout, suppression, liste) */
  private favorisService = inject(FavorisService);
  /** Service pour recuperer les coordonnees des villes */
  private villesService = inject(VillesService);
  /** Service de synchronisation avec le composant carte (zoom, villes recentes) */
  private mapSyncService = inject(MapSyncService);
  /** Service de synchronisation de la barre de recherche entre composants */
  private searchSyncService = inject(SearchSyncService);

  /** Reference de destruction pour nettoyer automatiquement les subscriptions RxJS */
  private destroyRef = inject(DestroyRef);

  /** Liste des villes favorites, recuperee dynamiquement depuis le service */
  villes = computed(() => this.favorisService.favoris());

  /** Indicateur de chargement : vrai si aucune ville n'est encore chargee */
  isLoading = computed(() => this.villes().length === 0);

  /** Ville actuellement agrandie dans la grille (affichage des details) */
  expandedVille = signal<Ville | null>(null);

  /** Derniere ville zoomee sur la carte, pour eviter les appels API dupliques */
  private lastZoomedVille = signal<string | null>(null);

  /** Indique si la derniere selection etait manuelle (clic) ou via la barre de recherche */
  private isManualSelection = signal<boolean>(false);

  ngOnInit() {
    // On n'a pas besoin d'effect ici - les villes viennent du service
  }

  /** sync les changements d'Input avec le signal local */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['query']) {
      this.querySignal.set(this.query);
      // Réinitialiser la sélection manuelle quand la requête change (permet à la recherche de fonctionner)
      this.isManualSelection.set(false);
    }
  }

  /** Favoris filtres par le terme de recherche et tries par consultation recente */
  filtered = computed(() => {
    const villes = this.villes();
    const q = this.querySignal().trim().toLowerCase();
    const recent = this.mapSyncService.recentlyViewed();
    
    let result = villes;
    if (q) {
      result = villes.filter(v => v.nom.toLowerCase().includes(q));
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

  /** Ajoute ou retire une ville des favoris */
  toggleFavoris(ville: Ville) {
    this.favorisService.toggleFavoris(ville);
  }

  /** Verifie si une ville est dans la liste des favoris */
  isFavoris(nom: string): boolean {
    return this.favorisService.isFavoris(nom);
  }

  /** Agrandit la carte d'une ville et zoome sur sa position sur la carte */
  private expandAndZoom(ville: Ville) {
    // Remonter le scroll vers le haut de la liste des favoris
    // Un delai est necessaire pour laisser le DOM se mettre a jour
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

  /** Ouvre ou ferme les details d'une ville dans la grille */
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

  /** Verifie si une ville est actuellement agrandie */
  isExpanded(ville: Ville): boolean {
    return this.expandedVille()?.code === ville.code;
  }

  /** Encode une chaine de caracteres pour une utilisation dans les URLs */
  encodeURIComponent(str: string): string {
    return encodeURIComponent(str);
  }
}
