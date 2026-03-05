import { Component } from '@angular/core';
import { SearchBarComponent } from '../searchBar/searchBar.component';
import { FavorisDisplayComponent } from '../favoris-display/favoris-display.component';
import { FiltreComponent } from '../filtre/filtre.component';

@Component({
  selector: 'app-favoris', 
  standalone: true,         
  imports: [SearchBarComponent, FavorisDisplayComponent, FiltreComponent],            
  templateUrl: './favoris.component.html',
  styleUrl: './favoris.component.scss'
})
export class FavorisComponent {
  
}