import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { MessageService } from '../../services/message.service';
import { Transformation, Race } from '../../models/models';

@Component({
  selector: 'app-transformation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './transformation.component.html'
})
export class TransformationComponent implements OnInit, OnDestroy {
  transformationList: Transformation[] = [];
  races: Race[] = [];
  showForm = false;
  form: any = {};
  private destroy$ = new Subject<void>();

  constructor(private api: ApiService, public msg: MessageService) {}

  ngOnInit(): void {
    this.loadRaces();
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadRaces(): void {
    this.api.getRaces().pipe(takeUntil(this.destroy$)).subscribe(data => this.races = data);
  }

  load(): void {
    this.api.getTransformations().pipe(takeUntil(this.destroy$)).subscribe(data => this.transformationList = data);
  }

  transform(): void {
    const data = { ...this.form };
    this.api.addTransformation(data).pipe(takeUntil(this.destroy$)).subscribe({
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
      this.api.deleteTransformation(id).pipe(takeUntil(this.destroy$)).subscribe(() => {
        this.msg.show('Transformation et lot supprimés');
        this.load();
      });
    }
  }
}
