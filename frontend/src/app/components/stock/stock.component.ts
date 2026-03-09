import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { MessageService } from '../../services/message.service';
import { StockItem } from '../../models/models';

@Component({
  selector: 'app-stock',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stock.component.html'
})
export class StockComponent implements OnInit {
  stockList: StockItem[] = [];
  dateFiltre: string = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
  periodeNourriture: string = 'total';

  constructor(private api: ApiService, public msg: MessageService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.getStock(this.dateFiltre).subscribe({
      next: (data) => this.stockList = data,
      error: (err) => this.msg.show(err.error?.error || 'Erreur chargement stock', 'error')
    });
  }

  getTotalVivants(): number {
    return this.stockList.reduce((sum, s) => sum + s.poulets_vivants, 0);
  }

  getTotalVente(): number {
    return this.stockList.reduce((sum, s) => sum + this.getCA(s), 0);
  }

  getTotalBenefice(): number {
    return this.stockList.reduce((sum, s) => sum + this.getBenefice(s), 0);
  }

  getTotalNourriture(): number {
    return this.stockList.reduce((sum, s) => sum + this.getNourriture(s), 0);
  }

  getTotalCoutNourriture(): number {
    return this.stockList.reduce((sum, s) => sum + this.getCoutNourriture(s), 0);
  }

  getDepenses(s: StockItem): number {
    switch (this.periodeNourriture) {
      case 'jour': return s.depenses_jour;
      case 'semaine': return s.depenses_semaine;
      case 'mois': return s.depenses_mois;
      case 'total': return s.depenses_total;
      default: return s.depenses_jour;
    }
  }

  getTotalDepenses(): number {
    return this.stockList.reduce((sum, s) => sum + this.getDepenses(s), 0);
  }

  getCoutNourriture(s: StockItem): number {
    switch (this.periodeNourriture) {
      case 'jour': return s.cout_nourriture_jour;
      case 'semaine': return s.cout_nourriture_semaine;
      case 'mois': return s.cout_nourriture_mois;
      case 'total': return s.cout_nourriture_total;
      default: return s.cout_nourriture_jour;
    }
  }

  getNourriture(s: StockItem): number {
    switch (this.periodeNourriture) {
      case 'jour': return s.nourriture_jour_g;
      case 'semaine': return s.nourriture_semaine_g;
      case 'mois': return s.nourriture_mois_g;
      case 'total': return s.nourriture_total_g;
      default: return s.nourriture_jour_g;
    }
  }

  getPeriodeLabel(): string {
    switch (this.periodeNourriture) {
      case 'jour': return '/jour';
      case 'semaine': return '/sem';
      case 'mois': return '/mois';
      case 'total': return 'total';
      default: return '';
    }
  }

  getCA(s: StockItem): number {
    switch (this.periodeNourriture) {
      case 'jour': return s.ca_jour;
      case 'semaine': return s.ca_semaine;
      case 'mois': return s.ca_mois;
      case 'total': return s.ca_total;
      default: return s.ca_jour;
    }
  }

  getBenefice(s: StockItem): number {
    switch (this.periodeNourriture) {
      case 'jour': return s.benefice_jour;
      case 'semaine': return s.benefice_semaine;
      case 'mois': return s.benefice_mois;
      case 'total': return s.benefice_total;
      default: return s.benefice_jour;
    }
  }
}
