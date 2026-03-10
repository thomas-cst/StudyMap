import { Component, signal,input,output } from '@angular/core';

@Component({
	selector: 'app-filtre',
	templateUrl: './filtre.component.html',
	styleUrls: ['./filtre.component.scss'],
	standalone: true,
})
export class FiltreComponent {
    menus = input<'accueil' | 'favoris' | 'classement'>('accueil');

    onFiltreChange = output<string>();

	isMenuActive = signal(false);

	budgetMin = signal(200);
    budgetMax = signal(5000);

	clicBouton() {
		this.isMenuActive.update(value => !value);
	}

    // Cette fonction est appelée à chaque clic sur un radio button
    onOptionChange(event: Event) {
        const input = event.target as HTMLInputElement;
        const value = input.value;

        if (value === 'itineraire') {
            // On demande la position au navigateur
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    // On envoie les coordonnées au parent
                    this.onFiltreChange.emit(`geo:${lat},${lng}`);
                },
                (error) => {
                    console.error("Erreur de géolocalisation", error);
                    this.onFiltreChange.emit(value); // On envoie au moins la valeur simple
                }
            );
        } else {
            this.onFiltreChange.emit(value);
        }
        
        this.isMenuActive.set(false); 
    }

    updateMin(event: Event) {
        const input = event.target as HTMLInputElement;
        let value = parseInt(input.value);

        if (value >= this.budgetMax()) {
            value = this.budgetMax() - 10; // rester 10€ en dessous
            input.value = value.toString(); 
        }
        this.budgetMin.set(value);
    }

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