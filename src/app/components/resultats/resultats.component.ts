import { Component, input,Input, computed, signal, inject, effect, OnChanges, SimpleChanges, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FavorisService } from '../../services/favoris.service';
import { VillesService, Ville } from '../../services/villes.service';
import { MapSyncService } from '../../services/map-sync.service';
import { SearchSyncService } from '../../services/search-sync.service';

/**
 * Composant résultats - Grille des villes avec filtrage, favoris et zoom carte
 */
@Component({
  selector: 'app-resultats', 
  standalone: true,        
  imports: [CommonModule],            
  templateUrl: './resultats.component.html',
  styleUrl: './resultats.component.scss'
})
export class ResultatsComponent implements OnChanges, OnInit {
  @Input() query = '';

  private querySignal = signal('');

  filtreActuel = input<string>('');

  /** inject le service favoris */
  private favorisService = inject(FavorisService);
  private villesService = inject(VillesService);
  private mapSyncService = inject(MapSyncService);
  private searchSyncService = inject(SearchSyncService);
  private destroyRef = inject(DestroyRef);

  private villes = signal<Ville[]>([]);
  isLoading = signal(true);
  get favoris() {
    return this.favorisService.favoris;
  }

  expandedVille = signal<Ville | null>(null);
  private lastZoomedVille = signal<string | null>(null);
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

  /** Sync Input query avec le signal local */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['query']) {
      this.querySignal.set(this.query);
      this.isManualSelection.set(false);
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

    // Filtre "Bord de mer"
    if (currentFiltre === 'mer') {
      return list.filter(v => this.villesService.isVilleMer(v.nom));
    }
 
    // Filtre "Montagne"
    if (currentFiltre === 'montagne') {
      return list.filter(v => this.villesService.isVilleMontagne(v.nom));
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

  /** Villes en favoris uniquement */
  favorisFiltered = computed(() => {
    return this.villes().filter(v => this.favorisService.isFavoris(v.nom));
  });

  /** toggle une ville en favoris */
  toggleFavoris(ville: Ville) {
    this.favorisService.toggleFavoris(ville);
  }

  /** check si une ville est en favoris */
  isFavoris(nom: string): boolean {
    return this.favorisService.isFavoris(nom);
  }

  /** encode URI pour les URLs */
  encodeURIComponent(str: string): string {
    return encodeURIComponent(str);
  }

  /** Expand + zoom sur la carte */
  private expandAndZoom(ville: Ville) {
    setTimeout(() => {
      const el = document.querySelector('.resultats');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
    
    // Ajouter aux récemment consultées
    this.mapSyncService.addToRecentlyViewed(ville.code);
    
    if (ville.lat !== undefined && ville.lng !== undefined) {
      this.mapSyncService.zoomToVille(ville.nom, ville.lat, ville.lng);
    } else {
      // Fallback: récupérer via Open-Meteo
      this.villesService.getCoordinatesForVille(ville.nom, ville.code)
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