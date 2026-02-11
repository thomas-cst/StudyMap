import { Component, signal } from '@angular/core';

@Component({
	selector: 'app-filtre',
	templateUrl: './filtre.component.html',
	styleUrls: ['./filtre.component.scss'],
	standalone: true,
})
export class FiltreComponent {
	isMenuActive = signal(false);

	clicBouton() {
		this.isMenuActive.update(value => !value);
	}
}