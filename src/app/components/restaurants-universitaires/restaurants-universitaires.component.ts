import { Component, Input, OnChanges, SimpleChanges, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RestauUnivService, RestaurantUniversitaire } from '../../services/restau-univ.service';

@Component({
  selector: 'app-restaurants-universitaires',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './restaurants-universitaires.component.html',
  styleUrl: './restaurants-universitaires.component.scss'
})
export class RestaurantsUniversitairesComponent implements OnChanges {
  @Input() universiteId!: number;

  private restauService = inject(RestauUnivService);

  isLoading = signal(false);
  restaurants = signal<RestaurantUniversitaire[]>([]);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['universiteId'] && this.universiteId) {
      this.loadRestaurants();
    }
  }

  private loadRestaurants() {
    this.isLoading.set(true);
    this.restauService.getByUniversiteId(this.universiteId).subscribe({
      next: (data) => {
        this.restaurants.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.restaurants.set([]);
        this.isLoading.set(false);
      }
    });
  }

  getGoogleAddressUrl(restau: RestaurantUniversitaire): string {
    const query = [restau.nom, restau.adresse].filter(Boolean).join(' ');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }
}
