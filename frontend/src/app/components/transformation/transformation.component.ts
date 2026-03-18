import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { MessageService } from '../../services/message.service';
import { Transformation, Race } from '../../models/models';

@Component({
  selector: 'app-transformation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './transformation.component.html'
})
export class TransformationComponent implements OnInit {
  transformationList: Transformation[] = [];
  races: Race[] = [];
  showForm = false;
  form: any = {};

  constructor(private api: ApiService, public msg: MessageService) {}

  ngOnInit(): void {
    this.loadRaces();
    this.load();
  }

  loadRaces(): void {
    this.api.getRaces().subscribe(data => this.races = data);
  }

  load(): void {
    this.api.getTransformations().subscribe(data => this.transformationList = data);
  }

  transform(): void {
    const data = { ...this.form };
    this.api.addTransformation(data).subscribe({
      next: (res) => {
        this.msg.show(
          `Transformation réussie ! Lot "${res.lot.nom}" créé avec ${res.lot.nombre} poussins`
        );
        this.form = {};
        this.showForm = false;
        this.load();
      },
      error: (err) => this.msg.show(err.error?.error || 'Erreur lors de la transformation', 'error')
    });
  }

  remove(id: number): void {
    if (confirm('Supprimer cette transformation et le lot auto-généré ?')) {
      this.api.deleteTransformation(id).subscribe(() => {
        this.msg.show('Transformation et lot supprimés');
        this.load();
      });
    }
  }
}
