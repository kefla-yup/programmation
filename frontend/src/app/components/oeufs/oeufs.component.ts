import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { MessageService } from '../../services/message.service';
import { Oeuf, StockOeuf, Race } from '../../models/models';

@Component({
  selector: 'app-oeufs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './oeufs.component.html'
})
export class OeufsComponent implements OnInit {
  oeufsList: Oeuf[] = [];
  stockOeufs: StockOeuf[] = [];
  races: Race[] = [];
  showForm = false;
  form: any = {};
  editing: number | null = null;
  editForm: any = {};

  constructor(private api: ApiService, public msg: MessageService) {}

  ngOnInit(): void {
    this.loadRaces();
    this.load();
  }

  loadRaces(): void {
    this.api.getRaces().subscribe(data => this.races = data);
  }

  load(): void {
    this.api.getOeufs().subscribe(data => this.oeufsList = data);
    this.api.getStockOeufs().subscribe(data => this.stockOeufs = data);
  }

  add(): void {
    const data = { ...this.form };
    this.api.addOeuf(data).subscribe({
      next: () => {
        this.msg.show('Oeufs ajoutés avec succès');
        this.form = {};
        this.showForm = false;
        this.load();
      },
      error: (err) => this.msg.show(err.error?.error || 'Erreur', 'error')
    });
  }

  edit(oeuf: Oeuf): void {
    this.editing = oeuf.id;
    this.editForm = {
      date_reception: oeuf.date_reception.split('T')[0],
      race_id: oeuf.race_id,
      nombre: oeuf.nombre
    };
  }

  cancelEdit(): void {
    this.editing = null;
    this.editForm = {};
  }

  saveEdit(id: number): void {
    const data = { ...this.editForm };
    this.api.updateOeuf(id, data).subscribe({
      next: () => {
        this.msg.show("Entrée d'oeufs modifiée avec succès");
        this.editing = null;
        this.load();
      },
      error: (err) => this.msg.show(err.error?.error || 'Erreur lors de la modification', 'error')
    });
  }

  remove(id: number): void {
    if (confirm("Supprimer cette entrée d'oeufs ?")) {
      this.api.deleteOeuf(id).subscribe(() => {
        this.msg.show('Entrée supprimée');
        this.load();
      });
    }
  }
}
