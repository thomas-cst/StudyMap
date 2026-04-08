/**
 * Composant météo
 * permet de récupérer un jour de la semaine choisi
 */
import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-meteo-apercu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './meteo-apercu.component.html',
  styleUrls: ['./meteo-apercu.component.scss']
})
export class MeteoApercuComponent implements OnInit {
  @Input() meteo: any;

  joursSemaine = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  constructor() {}

  ngOnInit(): void {}

  /** Retourne un jour de la semaine */
  getJour(index: number, dateStr: string): string {
    const date = new Date(dateStr); // nom du jour (lund, mar,...)
    const day = date.getDay();
    return this.joursSemaine[(day + 6) % 7];
  }
}
