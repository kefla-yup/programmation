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
    const data = { ...this.form };
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
      nombre_morts_males: m.nombre_morts_males || 0,
      nombre_morts_femelles: m.nombre_morts_femelles || 0
    };
  }

  cancelEdit(): void {
    this.editing = null;
    this.editForm = {};
  }

  saveEdit(id: number): void {
    const data = { ...this.editForm };
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
