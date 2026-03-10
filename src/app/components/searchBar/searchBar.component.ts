import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-searchBar', 
  standalone: true,        
  imports: [CommonModule],           
  templateUrl: './searchBar.component.html',
  styleUrl: './searchBar.component.scss'
})
export class SearchBarComponent {
  /** émet le terme recherché (chaîne vide si on veut effacer) */
  @Output() search = new EventEmitter<string>();

  /** déclenché lors de la saisie ou de la validation */
  onSearch(value: string) {
    this.search.emit(value.trim());
  }
}