/**
 * Composant SearchBar - Barre de recherche de villes
 * 
 * Recoit une query du parent et emet les termes recherches
 * Utilise ngModel pour le binding bidirectionnel avec le champ input
 */
import { Component, EventEmitter, Output, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-searchBar', 
  standalone: true,        
  imports: [CommonModule, FormsModule],           
  templateUrl: './searchBar.component.html',
  styleUrl: './searchBar.component.scss'
})
export class SearchBarComponent implements OnChanges {
  /** Terme de recherche recu du composant parent */
  @Input() query = '';

  /** Valeur locale de l'input liee avec ngModel (permet l'edition sans modifier le parent) */
  inputValue = '';

  /** Evenement emis vers le parent quand l'utilisateur lance une recherche */
  @Output() search = new EventEmitter<string>();

  /** Quand la query change depuis le parent, synchronise la valeur locale de l'input */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['query']) {
      // Quand la query change du parent, mettre à jour l'input local aussi
      this.inputValue = this.query;
    }
  }

  /** Emet le terme de recherche vers le composant parent (supprime les espaces inutiles) */
  onSearch(value: string) {
    this.search.emit(value.trim());
  }
}