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
  /** la query courante (passée du parent) */
  @Input() query = '';

  /** valeur locale de l'input pour binding avec ngModel */
  inputValue = '';

  /** émet le terme recherché (chaîne vide si on veut effacer) */
  @Output() search = new EventEmitter<string>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['query']) {
      // Quand la query change du parent, mettre à jour l'input local aussi
      this.inputValue = this.query;
    }
  }

  /** déclenché lors de la saisie ou de la validation */
  onSearch(value: string) {
    this.search.emit(value.trim());
  }
}