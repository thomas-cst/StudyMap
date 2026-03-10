import { Component, signal } from '@angular/core';
import { SearchBarComponent } from '../searchBar/searchBar.component';
import { ResultatsComponent } from '../resultats/resultats.component';
import { FiltreComponent } from '../filtre/filtre.component';

@Component({
  selector: 'app-classement', 
  standalone: true,         
  imports: [SearchBarComponent, ResultatsComponent, FiltreComponent],            
  templateUrl: './classement.component.html',
  styleUrl: './classement.component.scss'
})
export class ClassementComponent {
  /** terme actuellement recherché */
  searchTerm = signal('');

  onSearch(city: string) {
    this.searchTerm.set(city);
  }

  get query() {
    return this.searchTerm();
  }
  filtreActuel = signal('');

  onFiltreChange(filtre: string) {
    this.filtreActuel.set(filtre);
  }
}