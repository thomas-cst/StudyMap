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
        const val = +(event.target as HTMLInputElement).value;
        if (val <= this.budgetMax()) {
            this.budgetMin.set(val);
        }
    }

    updateMax(event: Event) {
        const val = +(event.target as HTMLInputElement).value;
        if (val >= this.budgetMin()) {
            this.budgetMax.set(val);
        }
    }
}