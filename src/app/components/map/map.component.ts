import { Component, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';

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

	ngAfterViewInit(): void {
		this.initMap();
	}

	ngOnDestroy(): void {
		if (this.map) {
			this.map.remove();
		}
	}

	private initMap() {
        this.map = L.map(this.mapContainer.nativeElement).setView([48.00611, 0.19955], 13);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap contributors © CARTO',
        }).addTo(this.map);
		
	}
}

