import { Component, AfterViewInit, OnDestroy, ViewChild, ElementRef, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
    selector: 'app-map',
    templateUrl: './map.component.html',
    styleUrls: ['./map.component.scss'],
    standalone: true,
})
export class MapComponent implements AfterViewInit, OnDestroy {
    @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;
    private map: any;

    constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

    async ngAfterViewInit(): Promise<void> {
        if (isPlatformBrowser(this.platformId)) {
            const L = await import('leaflet'); 
            this.initMap(L);
        }
    }

    ngOnDestroy(): void {
        if (this.map) {
            this.map.remove();
        }
    }

    private initMap(L: any) {
        this.map = L.map(this.mapContainer.nativeElement).setView([48.00611, 0.19955], 13);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap contributors © CARTO',
        }).addTo(this.map);
    }
}