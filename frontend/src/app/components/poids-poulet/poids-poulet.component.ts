import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { MessageService } from '../../services/message.service';
import { Race } from '../../models/models';

@Component({
  selector: 'app-poids-poulet',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './poids-poulet.component.html'
})
export class PoidsPouletComponent implements OnInit {
  races: Race[] = [];
  raceId: number | null = null;
  dateDebut = '';
  dateFin = '';
  resultat: any = null;

  constructor(private api: ApiService, public msg: MessageService) {}

  ngOnInit(): void {
    this.api.getRaces().subscribe(data => this.races = data);
    const today = new Date();
    this.dateFin = today.toISOString().split('T')[0];
  }

  calculer(): void {
    if (!this.raceId || !this.dateDebut || !this.dateFin) {
      this.msg.show('Veuillez remplir tous les champs', 'error');
      return;
    }

    this.api.getPoidsPoulet(this.raceId, this.dateDebut, this.dateFin).subscribe({
      next: (data) => {
        this.resultat = data;
      },
      error: (err) => {
        this.resultat = null;
        this.msg.show(err.error?.error || 'Erreur lors du calcul', 'error');
      }
    });
  }
}
