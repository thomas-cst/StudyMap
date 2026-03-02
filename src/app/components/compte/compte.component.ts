import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-compte',
  templateUrl: './compte.component.html',
  styleUrls: ['./compte.component.css'],
  standalone: true
})
export class CompteComponent {
  /** emitted when the user closes the popup */
  @Output() closed = new EventEmitter<void>();

  close(): void {
    this.closed.emit();
  }
}
