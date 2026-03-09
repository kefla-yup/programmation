import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { MessageService } from '../../services/message.service';
import { Lot, Race } from '../../models/models';

@Component({
  selector: 'app-lots',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [DatePipe],
  templateUrl: './lots.component.html'
})
export class LotsComponent implements OnInit {
  lotsList: Lot[] = [];
  races: Race[] = [];
  showForm = false;
  form: any = { age_entree_semaine: 0 };
  editing: number | null = null;
  editForm: any = {};

  constructor(private api: ApiService, public msg: MessageService, private datePipe: DatePipe) {}

  ngOnInit(): void {
    this.loadRaces();
    this.load();
  }

  loadRaces(): void {
    this.api.getRaces().subscribe(data => this.races = data);
  }

  load(): void {
    this.api.getLots().subscribe(data => this.lotsList = data);
  }

  formatDate(date: string): string {
    return date.split('T')[0];
  }

  add(): void {
    const data = { ...this.form };
    this.api.addLot(data).subscribe({
      next: () => {
        this.msg.show('Lot ajouté avec succès');
        this.form = { age_entree_semaine: 0 };
        this.showForm = false;
        this.load();
      },
      error: (err) => this.msg.show(err.error?.error || "Erreur lors de l'ajout", 'error')
    });
  }

  edit(lot: Lot): void {
    this.editing = lot.id;
    this.editForm = {
      nom: lot.nom,
      date_entree: lot.date_entree.split('T')[0],
      nombre: lot.nombre,
      race_id: lot.race_id,
      age_entree_semaine: lot.age_entree_semaine
    };
  }

  cancelEdit(): void {
    this.editing = null;
    this.editForm = {};
  }

  saveEdit(id: number): void {
    const data = { ...this.editForm };
    this.api.updateLot(id, data).subscribe({
      next: () => {
        this.msg.show('Lot modifié avec succès');
        this.editing = null;
        this.load();
      },
      error: (err) => this.msg.show(err.error?.error || 'Erreur lors de la modification', 'error')
    });
  }

  remove(id: number): void {
    if (confirm('Supprimer ce lot et ses mortalités associées ?')) {
      this.api.deleteLot(id).subscribe(() => {
        this.msg.show('Lot supprimé');
        this.load();
      });
    }
  }
}
