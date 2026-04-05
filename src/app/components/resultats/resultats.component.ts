/** Cache mémoire des itinéraires déjà calculés (clé: userLat,userLng-villeLat,villeLng) */
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
import { Component, input, Input, computed, signal, inject, effect, OnChanges, SimpleChanges, OnInit, DestroyRef } from '@angular/core';
import { UserLocationService, UserLocation } from '../../services/user-location.service';
import { ItineraireService } from '../../services/itineraire.service';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FavorisService } from '../../services/favoris.service';
import { VillesService, Ville } from '../../services/villes.service';
import { UniversitesService, Universite } from '../../services/universites.service';
import { MapSyncService } from '../../services/map-sync.service';
import { SearchSyncService } from '../../services/search-sync.service';
import { RestaurantsUniversitairesComponent } from '../restaurants-universitaires/restaurants-universitaires.component';
import { ItineraireCardComponent } from '../itineraire-card/itineraire-card.component';
import { MeteoApercuComponent } from '../meteo-apercu/meteo-apercu.component';
import { MeteoService } from '../../services/meteo.service';
import { AuthService } from '../../services/auth.service';
import { AuthPopupService } from '../../services/auth-popup.service';
import { LoyerService } from '../../services/loyer.service';
import { EmploiService, VilleEmploi } from '../../services/emploi.service';

/**
 * Composant résultats - Grille des villes avec filtrage, favoris et zoom carte
 */
@Component({
  selector: 'app-resultats',
  standalone: true,
  imports: [CommonModule, RestaurantsUniversitairesComponent, ItineraireCardComponent, MeteoApercuComponent],
  templateUrl: './resultats.component.html',
  styleUrl: './resultats.component.scss'
})
export class ResultatsComponent implements OnChanges, OnInit {
    private emploiService = inject(EmploiService);
    public classementEmploi = signal<VilleEmploi[] | null>(null);
  /** Terme de recherche recu depuis le composant parent */
  @Input() query = '';

  /** Signal local pour suivre la query de maniere reactive */
  private querySignal = signal('');

  /** Cache mémoire des itinéraires déjà calculés (clé: userLat,userLng-villeLat,villeLng) */
  private itineraireCache = new Map<string, { distance: number; duration: number }>();
  /** Cache météo par ville (clé: code ville) */
  meteoCache: { [key: string]: any } = {};

  /** Filtre actuellement selectionne (recu du parent via input) */
  filtreActuel = input<string>('');

  /** Service de gestion des favoris */
  private favorisService = inject(FavorisService);
  /** Service pour recuperer les villes et leurs coordonnees */
  private villesService = inject(VillesService);
  private universitesService = inject(UniversitesService);
  /** Service de synchronisation avec la carte (zoom, villes recentes) */
  private mapSyncService = inject(MapSyncService);
  /** Service de synchronisation de la barre de recherche */
  private searchSyncService = inject(SearchSyncService);
  /** Service d'authentification pour verifier la connexion */
  private authService = inject(AuthService);
  /** Service pour demander l'ouverture de la popup de connexion */
  private authPopupService = inject(AuthPopupService);
  /** Reference de destruction pour nettoyer les subscriptions RxJS */
  private destroyRef = inject(DestroyRef);
  /** Service ... */
  private meteoService = inject(MeteoService);

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

  /** Position géolocalisée de l'utilisateur (null si refusée) */
  userLocation = signal<UserLocation | null>(null);
  geoError = signal<string | null>(null);
  private userLocationService = inject(UserLocationService);
  private itineraireService = inject(ItineraireService);
  /** Résultat du calcul d'itinéraire (distance km, durée min) */
  itineraire = signal<{ distance: number | null, duration: number | null } | null>(null);
  itineraireLoading = signal(false);
  itineraireError = signal<string | null>(null);
  expandedUniversiteId = signal<number | null>(null);
  universitesMap = signal<{ [villeId: number]: Universite[] }>({});
  universitesLoading = signal(false);
  /** Derniere ville zoomee pour eviter les appels API dupliques */
  private lastZoomedVille = signal<string | null>(null);
  /** Indique si la selection est manuelle (clic) ou automatique (recherche) */
  private isManualSelection = signal<boolean>(false);

  /** Charge les villes depuis le backend au demarrage */
  ngOnInit() {
    this.loadVilles();
    // S'abonner à la position utilisateur mutualisée
    this.userLocationService.location$.subscribe(loc => this.userLocation.set(loc));
    this.userLocationService.error$.subscribe(err => this.geoError.set(err));
    // Demande la localisation au premier chargement du site
    this.userLocationService.requestLocation();

    this.emploiService.getClassementEmploi().subscribe(data => {
      console.log('Données emploi reçues :', data);
      this.classementEmploi.set(data);
    });
  }

  /** Relance la demande de localisation utilisateur (ex: clic sur "autour de moi" ou détail ville) */
  requestUserLocation(force = true) {
    this.userLocationService.requestLocation(force);
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
          this.loadUniversites(matching);
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
  // Cache local pour l'ensoleillement (évite les appels multiples)
  private sunshineCache: { [key: string]: number } = {};
  // Signal pour forcer le recalcul du tri météo
  private sunshineRefresh = signal(0);
  // Signal pour forcer le recalcul du tri budget
  private loyerRefresh = signal(0);
  // Cache pour les lieux festifs par ville
  private lieuxFestifsCache: { [key: string]: number } = {};
  // Signal pour forcer le recalcul du tri festif
  private lieuxFestifsRefresh = signal(0);

  filtered = computed(() => {
    let list = [...this.villes()];
    const dataEmploi = this.classementEmploi();
    let currentFiltre: any = this.filtreActuel();
    if (typeof currentFiltre === 'string' && currentFiltre.startsWith('{')) {
      try { currentFiltre = JSON.parse(currentFiltre); } catch { }
    }
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

    // Filtre "Météo / Ensoleillement"
    if (currentFiltre === 'meteo') {
      this.sunshineRefresh();
      list.forEach(v => {
        if (v.lat !== undefined && v.lng !== undefined && this.sunshineCache[v.nom] === undefined) {
          this.villesService.getMonthlySunshine(v.lat, v.lng).subscribe(val => {
            this.sunshineCache[v.nom] = val;
            this.sunshineRefresh.set(this.sunshineRefresh() + 1);
          });
        }
      });
      return list.slice().sort((a, b) => (this.sunshineCache[b.nom] || 0) - (this.sunshineCache[a.nom] || 0));
    }

    // Filtre "Bars et Vie nocturne"
    if (currentFiltre === 'vieNocturne') {
      this.lieuxFestifsRefresh();
      list.forEach(v => {
        if (v.lat !== undefined && v.lng !== undefined) {
          if (this.lieuxFestifsCache[v.nom] === undefined) {
            this.villesService.getLieuxFestifs(v.nom).subscribe(val => {
              this.lieuxFestifsCache[v.nom] = val;
              this.lieuxFestifsRefresh.set(this.lieuxFestifsRefresh() + 1);
            });
          }
        } else {
          this.villesService.getCoordinatesForVille(v.nom, v.code).subscribe(coords => {
            v.lat = coords.lat;
            v.lng = coords.lng;
            this.lieuxFestifsRefresh.set(this.lieuxFestifsRefresh() + 1);
          });
        }
      });
      return list.slice().sort((a, b) => (this.lieuxFestifsCache[b.nom] || 0) - (this.lieuxFestifsCache[a.nom] || 0));
    }

    // Filtre "Emploi et Attractivité"
    if (currentFiltre === 'emploi') {
        console.log('dataEmploi:', dataEmploi);
        console.log('villes:', this.villes().map(v => v.nom));
        if (!dataEmploi) {
            return [];
        }

        const normalize = (str: string) =>
            str.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        return [...this.villes()].sort((a, b) => {
            const infoA = dataEmploi.find(e => normalize(e.ville) === normalize(a.nom));
            const infoB = dataEmploi.find(e => normalize(e.ville) === normalize(b.nom));
            const scoreA = infoA ? Number(infoA.nbobs_com) : 0;
            const scoreB = infoB ? Number(infoB.nbobs_com) : 0;
            return scoreB - scoreA;
        });
    }

    // Filtre "Loyer le moins cher"
    if (
      typeof currentFiltre === 'object' &&
      currentFiltre !== null &&
      'type' in currentFiltre &&
      currentFiltre.type === 'budget'
    ) {
      const min = typeof currentFiltre.min === 'number' ? currentFiltre.min : 0;
      const max = typeof currentFiltre.max === 'number' ? currentFiltre.max : 5000;
      const surface = typeof currentFiltre.surface === 'number' ? currentFiltre.surface : 50;
      this.loyerRefresh();
      list.forEach(v => {
        const cached = this.loyerCache()[v.code];
        const hasData = cached && (
          cached.studio !== undefined || cached.t2 !== undefined || cached.t3 !== undefined
        );
        if (!hasData) {
          this.villesService.getLoyerMoyen(v.nom, v.code).subscribe(val => {
            const existing = this.loyerCache()[v.code];
            if (!existing || (existing.studio === undefined && existing.t2 === undefined && existing.t3 === undefined)) {
              this.loyerCache.update(c => ({
                ...c,
                [v.code]: { studio: val ?? undefined, t2: val ?? undefined, t3: val ?? undefined }
              }));
            }
            this.loyerRefresh.set(this.loyerRefresh() + 1);
          });
        }
      });

      const getPrix = (code: string): number | undefined => {
        const c = this.loyerCache()[code];
        return c?.studio ?? c?.t2 ?? c?.t3;
      };

      const filteredList = list.filter(v => {
        const loyerM2 = getPrix(v.code);
        if (loyerM2 === undefined) return true;
        const loyerTotal = loyerM2 * surface;
        return loyerTotal >= min && loyerTotal <= max;
      });

      return filteredList.slice().sort((a, b) => {
        const aLoyer = (getPrix(a.code) ?? Infinity) * surface;
        const bLoyer = (getPrix(b.code) ?? Infinity) * surface;
        return aLoyer - bLoyer;
      });
    }

    // Filtre "Autour de moi"
    if (typeof currentFiltre === 'string' && currentFiltre.startsWith('geo:')) {
      const [lat, lng] = currentFiltre.replace('geo:', '').split(',').map(Number);
      return list
        .filter(v => v.lat !== undefined && v.lng !== undefined)
        .sort((a, b) => {
          const distA = this.getDistance(lat, lng, a.lat!, a.lng!);
          const distB = this.getDistance(lat, lng, b.lat!, b.lng!);
          return distA - distB;
        });
    }

    // Trier par consultés récemment si pas de géoloc
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

    return list;
  });

  /** Liste des villes qui sont en favoris */
  favorisFiltered = computed(() => {
    return this.villes().filter(v => this.favorisService.isFavoris(v.nom));
  });

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
      this.expandedUniversiteId.set(null);
      this.isManualSelection.set(false);
      this.querySignal.set(''); // Vider le signal local
      this.searchSyncService.clearSearch(); // Demander au parent de vider l'input
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
      this.loadMeteo(ville);
      this.loadLoyer(ville);
    }
  }

  /** Charge l'itinéraire voiture entre la position utilisateur et la ville */
  private loadItineraire(ville: Ville) {
    this.itineraire.set(null);
    this.itineraireError.set(null);
    if (!this.userLocation() || ville.lat === undefined || ville.lng === undefined) {
      return;
    }
    const user = this.userLocation()!;
    const cacheKey = `${user.lat},${user.lng}-${ville.lat},${ville.lng}`;
    const cached = this.itineraireCache.get(cacheKey);
    if (cached) {
      this.itineraire.set(cached);
      return;
    }
    this.itineraireLoading.set(true);
    this.itineraireService.getItineraire(user, { lat: ville.lat, lng: ville.lng })
      .subscribe({
        next: (res) => {
          this.itineraire.set(res);
          this.itineraireCache.set(cacheKey, res);
          this.itineraireLoading.set(false);
        },
        error: (err) => {
          this.itineraireError.set("Erreur lors du calcul de l'itinéraire.");
          this.itineraireLoading.set(false);
        }
      });
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

  /** Verifie si une ville est actuellement agrandie */
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

  /** Calcule la distance en km entre deux coordonnees GPS (formule de Haversine) */
  private getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Rayon de la terre
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /** Charge la météo pour une ville et la met en cache */
  loadMeteo(ville: Ville) {
    if (this.meteoCache[ville.code] || ville.lat === undefined || ville.lng === undefined) return;
    this.meteoService.getMeteoSemaine(ville.lat, ville.lng).subscribe({
      next: (data) => {
        this.meteoCache[ville.code] = data;
      },
      error: () => {
        this.meteoCache[ville.code] = null;
      }
    });
  }

  private loyerService = inject(LoyerService);
  loyerCache = signal<{ [code: string]: { studio?: number, t2?: number, t3?: number } }>({});

  /** Charge les loyers (studio/t2/t3) depuis le CSV pour l'affichage dans la fiche ville */
  loadLoyer(ville: Ville) {
    const cached = this.loyerCache()[ville.code];
    const hasData = cached && (
      cached.studio !== undefined || cached.t2 !== undefined || cached.t3 !== undefined
    );
    if (hasData) return;

    this.loyerService.getLoyerVille(ville.nom).subscribe(data => {
      this.loyerCache.update(c => ({ ...c, [ville.code]: data || {} }));
    });
  }
  
}