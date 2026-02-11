import { Component } from '@angular/core';
import { SearchBarComponent } from '../searchBar/searchBar.component';
import { ResultatsComponent } from '../resultats/resultats.component';
import { FiltreComponent } from '../filtre/filtre.component';

@Component({
  selector: 'app-accueil', 
  standalone: true,         
  imports: [SearchBarComponent,ResultatsComponent,FiltreComponent],            
  templateUrl: './accueil.component.html',
  styleUrl: './accueil.component.scss'
})
export class AccueilComponent {
  
}