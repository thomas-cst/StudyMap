import { Component, AfterViewInit, OnDestroy, ViewChild, ElementRef, Inject, PLATFORM_ID, signal, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

declare const L: any;

@Component({
    selector: 'app-map',
    templateUrl: './map.component.html',
    styleUrls: ['./map.component.scss'],
    standalone: true,
})
export class MapComponent implements AfterViewInit, OnDestroy {
    @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;
    private map: any;
	private tileLayer: any;
	private isDarkMode = signal(false);

	constructor(@Inject(PLATFORM_ID) private platformId: Object) {
		// Observer les changements de thème et mettre à jour la carte
		effect(() => {
			if (this.isDarkMode() && this.tileLayer) {
				this.updateTileLayer(true);
			} else if (this.tileLayer) {
				this.updateTileLayer(false);
			}
		});
	}

    ngAfterViewInit(): void {
        if (isPlatformBrowser(this.platformId)) {
            this.initMap();
            this.observeThemeChanges();
        }
    }

    ngOnDestroy(): void {
        if (this.map) {
            this.map.remove();
        }
    }

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