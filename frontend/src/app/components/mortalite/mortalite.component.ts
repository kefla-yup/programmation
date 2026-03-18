import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { MessageService } from '../../services/message.service';
import { Mortalite, Lot } from '../../models/models';

@Component({
  selector: 'app-mortalite',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mortalite.component.html'
})
export class MortaliteComponent implements OnInit {
  mortaliteList: Mortalite[] = [];
  lots: Lot[] = [];
  showForm = false;
  form: any = {};
  editing: number | null = null;
  editForm: any = {};

  constructor(private api: ApiService, public msg: MessageService) {}

  ngOnInit(): void {
    this.loadLots();
    this.load();
  }

  loadLots(): void {
    this.api.getLots().subscribe(data => this.lots = data);
  }

  load(): void {
    this.api.getMortalite().subscribe(data => this.mortaliteList = data);
  }

  add(): void {
    const data: any = {
      lot_id: this.form.lot_id,
      date_mortalite: this.form.date_mortalite,
      nombre: this.form.nombre
    };
    const pctM = this.form.pct_males || 0;
    const pctF = this.form.pct_femelles || 0;
    if (pctM > 0 || pctF > 0) {
      data.nombre_morts_males = Math.round(data.nombre * pctM / 100);
      data.nombre_morts_femelles = data.nombre - data.nombre_morts_males;
    }
    this.api.addMortalite(data).subscribe({
      next: () => {
        this.msg.show('Mortalité enregistrée');
        this.form = {};
        this.showForm = false;
        this.load();
      },
      error: (err) => this.msg.show(err.error?.error || 'Erreur', 'error')
    });
  }

  edit(m: Mortalite): void {
    this.editing = m.id;
    this.editForm = {
      lot_id: m.lot_id,
      date_mortalite: m.date_mortalite.split('T')[0],
      nombre: m.nombre,
      pct_males: m.pct_morts_males || 0,
      pct_femelles: m.pct_morts_femelles || 0
    };
  }

  cancelEdit(): void {
    this.editing = null;
    this.editForm = {};
  }

  saveEdit(id: number): void {
    const data: any = {
      lot_id: this.editForm.lot_id,
      date_mortalite: this.editForm.date_mortalite,
      nombre: this.editForm.nombre
    };
    const pctM = this.editForm.pct_males || 0;
    const pctF = this.editForm.pct_femelles || 0;
    if (pctM > 0 || pctF > 0) {
      data.nombre_morts_males = Math.round(data.nombre * pctM / 100);
      data.nombre_morts_femelles = data.nombre - data.nombre_morts_males;
    } else {
      data.nombre_morts_males = 0;
      data.nombre_morts_femelles = 0;
    }
    this.api.updateMortalite(id, data).subscribe({
      next: () => {
        this.msg.show('Mortalité modifiée avec succès');
        this.editing = null;
        this.load();
      },
      error: (err) => this.msg.show(err.error?.error || 'Erreur lors de la modification', 'error')
    });
  }

  remove(id: number): void {
    if (confirm('Supprimer cette mortalité ?')) {
      this.api.deleteMortalite(id).subscribe(() => {
        this.msg.show('Mortalité supprimée');
        this.load();
      });
    }
  }
}
