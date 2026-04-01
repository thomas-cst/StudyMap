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
import { UniversitesService, Universite } from '../../services/universites.service';
import { MapSyncService } from '../../services/map-sync.service';
import { SearchSyncService } from '../../services/search-sync.service';
import { RestaurantsUniversitairesComponent } from '../restaurants-universitaires/restaurants-universitaires.component';
import { ItineraireCardComponent } from '../itineraire-card/itineraire-card.component';
import { ItineraireService } from '../../services/itineraire.service';
import { UserLocationService, UserLocation } from '../../services/user-location.service';
import { AuthService } from '../../services/auth.service';
import { AuthPopupService } from '../../services/auth-popup.service';

@Component({
  selector: 'app-favoris-display', 
  standalone: true,        
  imports: [CommonModule, RestaurantsUniversitairesComponent, ItineraireCardComponent],
  templateUrl: './favoris-display.component.html',
  styleUrl: './favoris-display.component.scss'
})
export class FavorisDisplayComponent implements OnChanges, OnInit {
  /** Terme de recherche recu depuis le composant parent */
  @Input() query = '';

  /** Signal local qui synchronise la valeur de l'Input query pour une utilisation reactive */
  private querySignal = signal('');

  /** Signal local pour rendre filtreActuel reactif dans computed() */
  private filtreActuelSignal = signal<any>('');

  private universitesService = inject(UniversitesService);
  /** Filtre actuellement selectionne (recu du composant parent) */
  @Input() filtreActuel: any = '';

  /** Service de gestion des favoris (ajout, suppression, liste) */
  private favorisService = inject(FavorisService);
  /** Service pour recuperer les coordonnees des villes */
  private villesService = inject(VillesService);
  /** Service de synchronisation avec le composant carte (zoom, villes recentes) */
  private mapSyncService = inject(MapSyncService);
  /** Service de synchronisation de la barre de recherche entre composants */
  private searchSyncService = inject(SearchSyncService);
  private userLocationService = inject(UserLocationService);
  private itineraireService = inject(ItineraireService);
  /** Service d'authentification pour verifier la connexion */
  private authService = inject(AuthService);
  /** Service pour demander l'ouverture de la popup de connexion */
  private authPopupService = inject(AuthPopupService);

  /** Reference de destruction pour nettoyer automatiquement les subscriptions RxJS */
  private destroyRef = inject(DestroyRef);

  /** Liste des villes favorites, recuperee dynamiquement depuis le service */
  villes = computed(() => this.favorisService.favoris());

  /** Indicateur de chargement : vrai si aucune ville n'est encore chargee */
  isLoading = computed(() => this.villes().length === 0);

  /** Ville actuellement agrandie dans la grille (affichage des details) */
  expandedVille = signal<Ville | null>(null);
  expandedUniversiteId = signal<number | null>(null);
  universitesMap = signal<{ [villeId: number]: Universite[] }>({});
  universitesLoading = signal(false);

  userLocation = signal<UserLocation | null>(null);
  geoError = signal<string | null>(null);
  itineraire = signal<{ distance: number | null; duration: number | null } | null>(null);
  itineraireLoading = signal(false);
  itineraireError = signal<string | null>(null);
  private itineraireCache = new Map<string, { distance: number; duration: number }>();

  /** Derniere ville zoomee sur la carte, pour eviter les appels API dupliques */
  private lastZoomedVille = signal<string | null>(null);

  /** Indique si la derniere selection etait manuelle (clic) ou via la barre de recherche */
  private isManualSelection = signal<boolean>(false);

  ngOnInit() {
    this.userLocationService.location$.subscribe(loc => this.userLocation.set(loc));
    this.userLocationService.error$.subscribe(err => this.geoError.set(err));
    this.userLocationService.requestLocation();
  }

  /** sync les changements d'Input avec le signal local */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['query']) {
      this.querySignal.set(this.query);
      this.isManualSelection.set(false);
    }
    if (changes['filtreActuel']) {
      this.filtreActuelSignal.set(this.filtreActuel);
    }
  }

  // Cache loyer moyen pour le filtre budget
  private loyerCache: { [key: string]: number | null } = {};
  private loyerRefresh = signal(0);

  /** Favoris filtres et tries selon la recherche et le filtre actif */
  filtered = computed(() => {
    let list = [...this.villes()];
    const currentFiltre: any = this.filtreActuelSignal();
    const q = this.querySignal().trim().toLowerCase();

    if (q) {
      list = list.filter(v => v.nom.toLowerCase().includes(q));
    }

    // Filtre "Autour de moi"
    if (typeof currentFiltre === 'string' && currentFiltre.startsWith('geo:')) {
      const [lat, lng] = currentFiltre.replace('geo:', '').split(',').map(Number);
      return list
        .filter(v => v.lat !== undefined && v.lng !== undefined)
        .sort((a, b) => this.getDistance(lat, lng, a.lat!, a.lng!) - this.getDistance(lat, lng, b.lat!, b.lng!));
    }

    // Filtre "Loyer le moins cher" (budget)
    if (typeof currentFiltre === 'object' && currentFiltre !== null && currentFiltre.type === 'budget') {
      const min = currentFiltre.min ?? 0;
      const max = currentFiltre.max ?? 5000;
      const surface = currentFiltre.surface ?? 50;
      this.loyerRefresh();
      list.forEach(v => {
        if (this.loyerCache[v.nom] === undefined) {
          this.villesService.getLoyerMoyen(v.nom, v.code).subscribe(val => {
            this.loyerCache[v.nom] = val;
            this.loyerRefresh.set(this.loyerRefresh() + 1);
          });
        }
      });
      return list
        .filter(v => {
          const loyer = this.loyerCache[v.nom];
          if (loyer === null || loyer === undefined) return false;
          const total = loyer * surface;
          return total >= min && total <= max;
        })
        .sort((a, b) => ((this.loyerCache[a.nom] ?? Infinity) * surface) - ((this.loyerCache[b.nom] ?? Infinity) * surface));
    }

    // Filtre "Qualité des transports"
    if (currentFiltre === 'transport') {
      const withScore = list.filter(v => v.score_transport !== null && v.score_transport !== undefined);
      const withoutScore = list.filter(v => v.score_transport === null || v.score_transport === undefined);
      withScore.sort((a, b) => (b.score_transport ?? 0) - (a.score_transport ?? 0));
      withoutScore.sort((a, b) => (b.nb_lignes_transport ?? 0) - (a.nb_lignes_transport ?? 0));
      return [...withScore, ...withoutScore];
    }

    // Par défaut : trier par consultées récemment
    const recent = this.mapSyncService.recentlyViewed();
    if (recent.length === 0) return list;
    const recentMap = new Map(recent.map((code, i) => [code, i]));
    return list.sort((a, b) => {
      const aIndex = recentMap.get(a.code);
      const bIndex = recentMap.get(b.code);
      if (aIndex !== undefined && bIndex === undefined) return -1;
      if (aIndex === undefined && bIndex !== undefined) return 1;
      if (aIndex !== undefined && bIndex !== undefined) return aIndex - bIndex;
      return 0;
    });
  });

  /** Retourne le badge à afficher sur la carte selon le filtre actif */
  getFilterBadge(v: Ville): string | null {
    const f: any = this.filtreActuelSignal();
    if (typeof f === 'string' && f.startsWith('geo:')) {
      if (v.lat === undefined || v.lng === undefined) return null;
      const [lat, lng] = f.replace('geo:', '').split(',').map(Number);
      const d = this.getDistance(lat, lng, v.lat, v.lng);
      return `${Math.round(d)} km`;
    }
    if (typeof f === 'object' && f?.type === 'budget') {
      const loyer = this.loyerCache[v.nom];
      if (loyer == null) return null;
      const surface = f.surface ?? 50;
      return `${Math.round(loyer * surface)} €/mois`;
    }
    if (f === 'transport') {
      if (v.score_transport != null) return `Score ${v.score_transport}`;
      if (v.nb_lignes_transport != null) return `${v.nb_lignes_transport} lignes`;
      return null;
    }
    return null;
  }

  /** Calcule la distance en km entre deux coordonnees GPS (formule de Haversine) */
  private getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /** Ajoute ou retire une ville des favoris (ouvre la popup login si non connecte) */
  toggleFavoris(ville: Ville) {
    if (!this.authService.isAuthenticated()) {
      this.authPopupService.requestLogin();
      return;
    }
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

  /** Charge l'itinéraire voiture entre la position utilisateur et la ville */
  private loadItineraire(ville: Ville) {
    this.itineraire.set(null);
    this.itineraireError.set(null);
    if (!this.userLocation() || ville.lat === undefined || ville.lng === undefined) return;
    const user = this.userLocation()!;
    const cacheKey = `${user.lat},${user.lng}-${ville.lat},${ville.lng}`;
    const cached = this.itineraireCache.get(cacheKey);
    if (cached) { this.itineraire.set(cached); return; }
    this.itineraireLoading.set(true);
    this.itineraireService.getItineraire(user, { lat: ville.lat, lng: ville.lng }).subscribe({
      next: (res) => {
        this.itineraire.set(res);
        this.itineraireCache.set(cacheKey, res);
        this.itineraireLoading.set(false);
      },
      error: () => {
        this.itineraireError.set("Erreur lors du calcul de l'itinéraire.");
        this.itineraireLoading.set(false);
      }
    });
  }

  /** Ouvre ou ferme les details d'une ville dans la grille */
  toggleExpanded(ville: Ville) {
    if (this.expandedVille()?.code === ville.code) {
      // Fermer la ville
      this.expandedVille.set(null);
      this.expandedUniversiteId.set(null);
      this.isManualSelection.set(false);
      this.querySignal.set('');
      this.searchSyncService.clearSearch();
      this.itineraire.set(null);
      this.itineraireError.set(null);
    } else {
      // Ouvrir une nouvelle ville
      this.expandedVille.set(ville);
      this.expandedUniversiteId.set(null);
      this.lastZoomedVille.set(ville.code);
      this.isManualSelection.set(true);
      this.querySignal.set('');
      this.expandAndZoom(ville);
      this.loadItineraire(ville);
      this.loadUniversites(ville);
    }
  }

  /** Charge les universités d'une ville */
  private loadUniversites(ville: Ville) {
    if (this.universitesMap()[ville.id]) return;
    this.universitesLoading.set(true);
    this.universitesService.getByVilleId(ville.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (unis) => {
          this.universitesMap.update(m => ({ ...m, [ville.id]: unis }));
          this.universitesLoading.set(false);
        },
        error: () => this.universitesLoading.set(false)
      });
  }

  /** Retourne les universités de la ville expanded */
  getUniversites(villeId: number): Universite[] {
    return this.universitesMap()[villeId] || [];
  }

  /** check si une ville est agrandie */
  isExpanded(ville: Ville): boolean {
    return this.expandedVille()?.code === ville.code;
  }

  toggleUniversiteRestaurants(universiteId: number): void {
    this.expandedUniversiteId.set(
      this.expandedUniversiteId() === universiteId ? null : universiteId
    );
  }

  isUniversiteExpanded(universiteId: number): boolean {
    return this.expandedUniversiteId() === universiteId;
  }

  /** encode URI pour les URLs */
  encodeURIComponent(str: string): string {
    return encodeURIComponent(str);
  }
}
