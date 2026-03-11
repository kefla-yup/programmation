import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { MessageService } from '../../services/message.service';
import { Race } from '../../models/models';

@Component({
  selector: 'app-races',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './races.component.html'
})
export class RacesComponent implements OnInit {
  races: Race[] = [];
  showForm = false;
  form: Partial<Race> = {};

  constructor(private api: ApiService, public msg: MessageService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.getRaces().subscribe(data => this.races = data);
  }

  add(): void {
    if (!this.form.nom || this.form.nom.trim() === '') {
      this.msg.show('Le nom de la race est requis', 'error');
      return;
    }

    this.api.addRace(this.form).subscribe({
      next: () => {
        this.msg.show('Race ajoutée avec succès');
        this.form = {};
        this.showForm = false;
        this.load();
      },
      error: (err) => this.msg.show(err.error?.error || "Erreur lors de l'ajout", 'error')
    });
  }

  delete(id: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette race ?')) {
      this.api.deleteRace(id).subscribe({
        next: () => {
          this.msg.show('Race supprimée avec succès');
          this.load();
        },
        error: (err) => this.msg.show(err.error?.error || "Erreur lors de la suppression", 'error')
      });
    }
  }
}
