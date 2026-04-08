/**
 * Composant Filtre - Menu deroulant avec les options de filtrage
 * 
 * Affiche differentes options selon le contexte (accueil, favoris, classement) :
 * - Accueil : decouvrir par localisation, mer, montagne, meteo
 * - Classement/Favoris : trier par budget, emploi, transport, vie nocturne
 * Gere aussi un slider double pour le budget min/max
 */
import { Component, signal,input,output,inject, ElementRef, HostListener  } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserLocationService } from '../../services/user-location.service';
    

@Component({
	selector: 'app-filtre',
	templateUrl: './filtre.component.html',
	styleUrls: ['./filtre.component.scss'],
	standalone: true,
    imports: [CommonModule],
})
export class FiltreComponent {

    public userLocationService = inject(UserLocationService);
    public geoError = signal<string | null>(null);
    
    /** Type de menu a afficher (determine les options de filtre disponibles) */
    menus = input<'accueil' | 'favoris' | 'classement'>('accueil');

    /** Evenement emis quand l'utilisateur selectionne un filtre */
    onFiltreChange = output<string>();

    /** Etat d'ouverture/fermeture du menu deroulant */
	isMenuActive = signal(false);

    /** Valeur minimale du slider budget (en euros) */
    budgetMin = signal(200);
    /** Valeur maximale du slider budget (en euros) */
    budgetMax = signal(5000);
    /** Surface du logement pour le calcul du loyer total */
    surface = signal(50);

    /** Valeur du filtre sélectionné */
    private filtreSelectionne: string | null = null;

    /** Reference a l'element DOM du composant (pour detecter les clics exterieurs) */
    private elementRef = inject(ElementRef);


    /** Ferme le menu si l'utilisateur clique en dehors du composant */
    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent) {
        if (this.isMenuActive() && !this.elementRef.nativeElement.contains(event.target)) {
            this.isMenuActive.set(false);
        }
    }
 
    /** Ouvre ou ferme le menu de filtres */
	clicBouton() {
		this.isMenuActive.update(value => !value);
	}

    /** Gere le changement d'option de filtre et emet la valeur au parent */
    onOptionChange(event: Event) {
        const input = event.target as HTMLInputElement;
        const value = input.value;
        this.filtreSelectionne = value;

        if (value === 'itineraire') {
            this.userLocationService.location$.subscribe((loc: any) => {
                if (loc) {
                    this.onFiltreChange.emit(`geo:${loc.lat},${loc.lng}`);
                }
            }).unsubscribe();
            this.userLocationService.error$.subscribe((err: any) => {
                this.geoError.set(err);
            }).unsubscribe();
            this.userLocationService.requestLocation(true);
        }
    }
    /** Valide le filtre choisi et l'émet au parent */
    validerFiltre() {
        if (!this.filtreSelectionne) return;
        if (this.filtreSelectionne === 'itineraire') {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    this.onFiltreChange.emit(`geo:${lat},${lng}`);
                },
                (error) => {
                    console.error("Erreur de géolocalisation", error);
                    this.onFiltreChange.emit(this.filtreSelectionne!);
                }
            );
        } else if (this.filtreSelectionne === 'budget') {
            const filtreBudget = {
                type: 'budget',
                min: this.budgetMin(),
                max: this.budgetMax(),
                surface: this.surface()
            };
            this.onFiltreChange.emit(JSON.stringify(filtreBudget));
        } else {
            this.onFiltreChange.emit(this.filtreSelectionne);
        }
    }

    /** Met a jour la valeur minimale du budget (empeche de depasser le max) */
    updateMin(event: Event) {
        const input = event.target as HTMLInputElement;
        let value = parseInt(input.value);

        if (value >= this.budgetMax()) {
            value = this.budgetMax() - 10; // rester 10€ en dessous
            input.value = value.toString(); 
        }
        this.budgetMin.set(value);
    }

    /** Met a jour la valeur maximale du budget (empeche de descendre sous le min) */
    updateMax(event: Event) {
        const input = event.target as HTMLInputElement;
        let value = parseInt(input.value);

        if (value <= this.budgetMin()) {
            value = this.budgetMin() + 10; // rester 10€ au dessus
            input.value = value.toString(); 
        }
        this.budgetMax.set(value);
    }
}