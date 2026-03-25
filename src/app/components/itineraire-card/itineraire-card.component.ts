import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-itineraire-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './itineraire-card.component.html',
  styleUrl: './itineraire-card.component.scss'
})
export class ItineraireCardComponent implements OnChanges {
  /** Résultat de l'itinéraire calculé */
  @Input() itineraire: { distance: number | null; duration: number | null } | null = null;
  /** Coordonnées de l'utilisateur */
  @Input() userLat: number | null = null;
  @Input() userLng: number | null = null;
  /** Coordonnées de la ville destination */
  @Input() villeLat: number | null = null;
  @Input() villeLng: number | null = null;

  /** URL Google Maps générée à partir des coordonnées */
  mapsUrl = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (this.userLat && this.userLng && this.villeLat && this.villeLng) {
      this.mapsUrl =
        `https://www.google.com/maps/dir/?api=1` +
        `&origin=${this.userLat},${this.userLng}` +
        `&destination=${this.villeLat},${this.villeLng}`;
    }
  }
}