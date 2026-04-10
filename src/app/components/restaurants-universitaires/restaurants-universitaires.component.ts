import { Component, Input, OnChanges, SimpleChanges, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RestauUnivService, RestaurantUniversitaire } from '../../services/restau-univ.service';

/**
 * Composant RestaurantsUniversitairesComponent - Affiche les restaurants universitaires d'une universite
 * Charge les restaurants depuis le service quand l'universiteId change.
 */
@Component({
  selector: 'app-restaurants-universitaires',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './restaurants-universitaires.component.html',
  styleUrl: './restaurants-universitaires.component.scss'
})
export class RestaurantsUniversitairesComponent implements OnChanges {
  /** ID de l'universite dont on veut afficher les restaurants */
  @Input() universiteId!: number;

  private restauService = inject(RestauUnivService);

  /** Indique si le chargement des restaurants est en cours */
  isLoading = signal(false);
  /** Liste des restaurants charges pour l'universite */
  restaurants = signal<RestaurantUniversitaire[]>([]);

  /** Recharge les restaurants quand l'universiteId change */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['universiteId'] && this.universiteId) {
      this.loadRestaurants();
    }
  }

  /** Recupere les restaurants depuis le service et met a jour le signal */
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

  /**
   * Construit une URL Google Maps permettant de localiser le restaurant
   * @param restau - Le restaurant dont on veut l'URL de localisation
   * @returns URL de recherche Google Maps pour le restaurant
   */
  getGoogleAddressUrl(restau: RestaurantUniversitaire): string {
    const query = [restau.nom, restau.adresse].filter(Boolean).join(' ');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }
}
