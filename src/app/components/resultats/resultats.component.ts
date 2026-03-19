/**
 * Composant Resultats - Grille des villes avec filtrage, favoris et zoom carte
 * 
 * Fonctionnalites :
 * - Chargement des villes depuis le backend
 * - Filtrage par recherche textuelle, bord de mer, montagne, geolocalisation
 * - Tri par villes recemment consultees
 * - Expansion d'une carte ville pour voir les details et zoomer sur la carte
 * - Gestion des favoris (ajout/suppression)
 * - Calcul de distance (formule de Haversine) pour le tri par proximite
 */
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
  /** Terme de recherche recu depuis le composant parent */
  @Input() query = '';

  /** Signal local pour suivre la query de maniere reactive */
  private querySignal = signal('');

  /** Filtre actuellement selectionne (recu du parent via input) */
  filtreActuel = input<string>('');

  /** Service de gestion des favoris */
  private favorisService = inject(FavorisService);
  /** Service pour recuperer les villes et leurs coordonnees */
  private villesService = inject(VillesService);
  /** Service de synchronisation avec la carte (zoom, villes recentes) */
  private mapSyncService = inject(MapSyncService);
  /** Service de synchronisation de la barre de recherche */
  private searchSyncService = inject(SearchSyncService);
  /** Reference de destruction pour nettoyer les subscriptions RxJS */
  private destroyRef = inject(DestroyRef);

  /** Liste de toutes les villes chargees depuis le backend */
  private villes = signal<Ville[]>([]);
  /** Indicateur de chargement des villes */
  isLoading = signal(true);
  /** Acces en lecture seule aux favoris du service */
  get favoris() {
    return this.favorisService.favoris;
  }

  /** Ville actuellement agrandie dans la grille */
  expandedVille = signal<Ville | null>(null);
  /** Derniere ville zoomee pour eviter les appels API dupliques */
  private lastZoomedVille = signal<string | null>(null);
  /** Indique si la selection est manuelle (clic) ou automatique (recherche) */
  private isManualSelection = signal<boolean>(false);

  /** Charge les villes depuis le backend au demarrage */
  ngOnInit() {
    this.loadVilles();
  }

  /** Recupere les villes via le service et met en cache les coordonnees manquantes */
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

  /** Synchronise le changement d'Input query avec le signal local */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['query']) {
      this.querySignal.set(this.query);
      this.isManualSelection.set(false);
    }
  }

  /** Liste filtree et triee des villes selon la recherche et les filtres actifs */
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

  /** Liste des villes qui sont en favoris */
  favorisFiltered = computed(() => {
    return this.villes().filter(v => this.favorisService.isFavoris(v.nom));
  });

  /** Ajoute ou retire une ville des favoris */
  toggleFavoris(ville: Ville) {
    this.favorisService.toggleFavoris(ville);
  }

  /** Verifie si une ville est dans la liste des favoris */
  isFavoris(nom: string): boolean {
    return this.favorisService.isFavoris(nom);
  }

  /** Encode une chaine pour utilisation dans les URLs */
  encodeURIComponent(str: string): string {
    return encodeURIComponent(str);
  }

  /** Agrandit la carte ville, scrolle vers le haut et zoome sur la carte Leaflet */
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

  /** Calcule la distance en km entre deux coordonnees GPS (formule de Haversine) */
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