import { Component } from '@angular/core';
import { SearchBarComponent } from '../searchBar/searchBar.component';
import { ResultatsComponent } from '../resultats/resultats.component';
import { FiltreComponent } from '../filtre/filtre.component';

@Component({
  selector: 'app-favoris', 
  standalone: true,         
  imports: [SearchBarComponent,ResultatsComponent,FiltreComponent],            
  templateUrl: './favoris.component.html',
  styleUrl: './favoris.component.scss'
})
export class FavorisComponent {
  
}