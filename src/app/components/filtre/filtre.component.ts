import { Component, signal } from '@angular/core';

@Component({
	selector: 'app-filtre',
	templateUrl: './filtre.component.html',
	styleUrls: ['./filtre.component.scss'],
	standalone: true,
})
export class FiltreComponent {
	isMenuActive = signal(false);

	budgetMin = signal(200);
    budgetMax = signal(5000);

	clicBouton() {
		this.isMenuActive.update(value => !value);
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