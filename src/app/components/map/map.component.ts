/**
 * Composant Map - Affiche la carte interactive Leaflet
 * 
 * Fonctionnalites :
 * - Initialisation de la carte Leaflet avec tuiles cartographiques
 * - Synchronisation du zoom avec les autres composants via MapSyncService
 * - Changement automatique de theme (clair/sombre) selon le mode choisi
 * - Utilisation de signaux Angular pour reagir aux changements
 */
import { Component, AfterViewInit, OnDestroy, ViewChild, ElementRef, Inject, PLATFORM_ID, signal, effect, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MapSyncService } from '../../services/map-sync.service';

/** Declaration de la variable globale Leaflet (chargee via CDN dans index.html) */
declare const L: any;

/**
 * Composant MapComponent - Affiche la carte interactive Leaflet
 * 
 * Responsabilités:
 * - Initialiser la carte Leaflet avec tileLayer
 * - Sincroniser le zoom avec le service MapSyncService
 * - Observer les changements de thème (dark/light)
 * - Afficher les marqueurs pour chaque ville
 * 
 * La carte utilise des signaux Angular pour réactiver les changements
 */
@Component({
    selector: 'app-map',
    templateUrl: './map.component.html',
    styleUrls: ['./map.component.scss'],
    standalone: true,
})
export class MapComponent implements AfterViewInit, OnDestroy {
    /** Reference vers le conteneur HTML de la carte */
    @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;
    /** Instance de la carte Leaflet */
    private map: any;
    /** Couche de tuiles actuelle (change selon le theme) */
	private tileLayer: any;
    /** Signal indiquant si le mode sombre est actif */
	private isDarkMode = signal(false);
    /** Service de synchronisation du zoom entre la carte et les autres composants */
	private mapSyncService = inject(MapSyncService);

	constructor(@Inject(PLATFORM_ID) private platformId: Object) {
		// Effet reactif : met a jour les tuiles quand le theme change
		effect(() => {
			if (this.isDarkMode() && this.tileLayer) {
				this.updateTileLayer(true);
			} else if (this.tileLayer) {
				this.updateTileLayer(false);
			}
		});

		// Effet reactif : zoome sur une ville quand le signal zoomTarget change
		effect(() => {
			const target = this.mapSyncService.zoomTarget();
			if (target && this.map) {
				console.log('INFO: Zoom vers', target.ville);
				try {
					this.map.setView([target.lat, target.lng], 12);
				} catch (e) {
					console.error('ERROR: Erreur lors du zoom:', e);
				}
			} else {
				if (!target) {
					console.log('INFO: En attente d\'un signal de zoom...');
				}
				if (!this.map) {
					console.log('INFO: Map pas encore initialisée, zoom en attente...');
				}
			}
		});
	}

    /** Initialise la carte apres le rendu de la vue (uniquement cote navigateur) */
    ngAfterViewInit(): void {
        if (isPlatformBrowser(this.platformId)) {
            this.initMap();
            this.observeThemeChanges();
        }
    }

    /** Detruit la carte Leaflet pour liberer la memoire */
    ngOnDestroy(): void {
        if (this.map) {
            this.map.remove();
        }
    }

    /** Cree la carte Leaflet centree sur la France et charge les tuiles selon le theme */
    private initMap() {
        this.map = L.map(this.mapContainer.nativeElement).setView([48.00611, 0.19955], 13);
		
		// Charger le thème initial
		const isDark = document.body.classList.contains('dark-mode');
		this.isDarkMode.set(isDark);
		
		const url = isDark 
		? 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png'
		: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

		const attribution = isDark
		? '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; OpenStreetMap contributors'
		: '&copy; OpenStreetMap contributors &copy; <a href="https://carto.com/">CARTO</a>';

		this.tileLayer = L.tileLayer(url, {
			attribution: attribution,
		}).addTo(this.map);

	}

	/** Observe les changements de classe CSS sur le body pour detecter le changement de theme */
	private observeThemeChanges() {
		// Observer les changements de la classe dark-mode sur le body
		const observer = new MutationObserver(() => {
			const isDark = document.body.classList.contains('dark-mode');
			this.isDarkMode.set(isDark);
		});

		observer.observe(document.body, {
			attributes: true,
			attributeFilter: ['class'],
		});
	}

	/** Remplace la couche de tuiles par celle correspondant au theme actuel */
	private updateTileLayer(isDark: boolean) {
		if (!this.map || !this.tileLayer) return;

		// Supprimer l'ancien tile layer
		this.map.removeLayer(this.tileLayer);

		// Ajouter le nouveau en fonction du thème
		const url = isDark
			? 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png'
			: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

		const attribution = isDark
			? '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; OpenStreetMap contributors'
			: '&copy; OpenStreetMap contributors &copy; <a href="https://carto.com/">CARTO</a>';

		this.tileLayer = L.tileLayer(url, {
			attribution: attribution,
		}).addTo(this.map);

	}
}