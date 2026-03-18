import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { MessageService } from '../../services/message.service';
import { ConfigPrix, Race } from '../../models/models';

@Component({
  selector: 'app-config-prix',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './config-prix.component.html'
})
export class ConfigPrixComponent implements OnInit {
  prixList: ConfigPrix[] = [];
  races: Race[] = [];
  form: Partial<ConfigPrix> = {};

  constructor(private api: ApiService, public msg: MessageService) {}

  ngOnInit(): void {
    this.loadRaces();
    this.load();
  }

  loadRaces(): void {
    this.api.getRaces().subscribe(data => this.races = data);
  }

  load(): void {
    this.api.getConfigPrix().subscribe(data => this.prixList = data);
  }

  save(): void {
    this.api.saveConfigPrix(this.form).subscribe({
      next: () => {
        this.msg.show('Prix enregistré avec succès');
        this.form = {};
        this.load();
      },
      error: (err) => this.msg.show(err.error?.error || 'Erreur', 'error')
    });
  }

  edit(item: ConfigPrix): void {
    this.form = {
      race_id: item.race_id,
      prix_achat_gramme: Number(item.prix_achat_gramme),
      prix_vente_gramme: Number(item.prix_vente_gramme),
      prix_nourriture_gramme: Number(item.prix_nourriture_gramme),
      prix_oeuf: Number(item.prix_oeuf)
    };
  }
}
