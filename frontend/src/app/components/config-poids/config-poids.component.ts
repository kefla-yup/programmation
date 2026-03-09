import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { MessageService } from '../../services/message.service';
import { ConfigPoids, Race } from '../../models/models';

@Component({
  selector: 'app-config-poids',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './config-poids.component.html'
})
export class ConfigPoidsComponent implements OnInit {
  configList: ConfigPoids[] = [];
  races: Race[] = [];
  showForm = false;
  filterRace = '';
  form: Partial<ConfigPoids> = {};
  editing: number | null = null;
  editForm: Partial<ConfigPoids> = {};

  constructor(private api: ApiService, public msg: MessageService) {}

  ngOnInit(): void {
    this.loadRaces();
    this.load();
  }

  loadRaces(): void {
    this.api.getRaces().subscribe(data => this.races = data);
  }

  load(): void {
    const raceId = this.filterRace ? Number(this.filterRace) : undefined;
    this.api.getConfigPoids(raceId).subscribe(data => this.configList = data);
  }

  add(): void {
    this.api.addConfigPoids(this.form).subscribe({
      next: () => {
        this.msg.show('Configuration de poids ajoutée avec succès');
        this.form = {};
        this.showForm = false;
        this.load();
      },
      error: (err) => this.msg.show(err.error?.error || "Erreur lors de l'ajout", 'error')
    });
  }

  edit(item: ConfigPoids): void {
    this.editing = item.id;
    this.editForm = {
      semaine: item.semaine,
      poids_cumule: Number(item.poids_cumule),
      variation: item.variation ? Number(item.variation) : null,
      nourriture_jour: Number(item.nourriture_jour)
    };
  }

  cancelEdit(): void {
    this.editing = null;
    this.editForm = {};
  }

  saveEdit(id: number): void {
    this.api.updateConfigPoids(id, this.editForm).subscribe({
      next: () => {
        this.msg.show('Configuration modifiée avec succès');
        this.editing = null;
        this.load();
      },
      error: (err) => this.msg.show(err.error?.error || 'Erreur lors de la modification', 'error')
    });
  }

  remove(id: number): void {
    if (confirm('Supprimer cette configuration ?')) {
      this.api.deleteConfigPoids(id).subscribe(() => {
        this.msg.show('Configuration supprimée');
        this.load();
      });
    }
  }
}
