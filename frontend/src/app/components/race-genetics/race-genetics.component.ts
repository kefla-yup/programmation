import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { MessageService } from '../../services/message.service';

@Component({
  selector: 'app-race-genetics',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="container">
      <h2>Configuration Génétique des Races</h2>
      
      <div class="race-selector">
        <select [(ngModel)]="selectedRaceId" (ngModelChange)="onRaceSelected()" class="form-control">
          <option value="">-- Sélectionner une race --</option>
          <option *ngFor="let race of races" [value]="race.id">{{ race.nom }}</option>
        </select>
      </div>

      <div *ngIf="form && selectedRaceId" class="form-container">
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="form-group">
          
          <div class="form-row">
            <div class="form-column">
              <label>Taux de Perte d'Œufs (%)</label>
              <input type="number" 
                     formControlName="taux_perte_oeufs"
                     min="0" max="100" step="0.01"
                     class="form-control"
                     placeholder="30">
              <small>% d'œufs pourris/infertiles</small>
            </div>

            <div class="form-column">
              <label>% Mâles</label>
              <input type="number" 
                     formControlName="ratio_male_femelle"
                     min="0" max="100" step="0.01"
                     class="form-control"
                     placeholder="30">
              <small>Pourcentage de mâles</small>
            </div>

            <div class="form-column">
              <label>% Femelles</label>
              <input type="number" 
                     [value]="100 - (form.get('ratio_male_femelle')?.value || 30)"
                     disabled
                     class="form-control">
              <small>Calculé automatiquement</small>
            </div>

            <div class="form-column">
              <label>Capacité de Ponte (Œufs)</label>
              <input type="number" 
                     formControlName="capacite_ponte"
                     min="0"
                     class="form-control"
                     placeholder="Optionnel">
              <small>Nombre max d'œufs par poule</small>
            </div>
          </div>

          <div class="form-row">
            <button type="submit" class="btn btn-primary">
              Enregistrer
            </button>
            <button type="button" (click)="onReset()" class="btn btn-secondary">
              Réinitialiser
            </button>
          </div>
        </form>

        <div class="info-box">
          <h3>Simulation d'éclosion</h3>
          <div class="simulation">
            <div class="sim-input">
              <label>Nombre d'œufs:</label>
              <input type="number" 
                     [(ngModel)]="simulationOeufs"
                     min="0"
                     class="form-control"
                     placeholder="1000">
            </div>
            
            <div class="sim-results" *ngIf="form.valid && simulationOeufs > 0">
              <div class="result-row">
                <span>Œufs de départ:</span>
                <strong>{{ simulationOeufs }}</strong>
              </div>
              <div class="result-row loss">
                <span>Œufs pourris ({{ form.get('taux_perte_oeufs')?.value }}%):</span>
                <strong>{{ calculateOeufsPertes() }}</strong>
              </div>
              <div class="result-row success">
                <span>Œufs éclos:</span>
                <strong>{{ calculateOeufsEclos() }}</strong>
              </div>
              <div class="result-row">
                <span class="indent">→ Mâles ({{ form.get('ratio_male_femelle')?.value }}%):</span>
                <strong>{{ calculateMales() }}</strong>
              </div>
              <div class="result-row">
                <span class="indent">→ Femelles ({{ 100 - (form.get('ratio_male_femelle')?.value || 30) }}%):</span>
                <strong>{{ calculateFemelles() }}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .container {
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }

    h2 {
      color: #333;
      margin-bottom: 20px;
    }

    .race-selector {
      margin-bottom: 30px;
    }

    .form-container {
      background: #f9f9f9;
      padding: 20px;
      border-radius: 8px;
      border: 1px solid #ddd;
    }

    .form-row {
      display: flex;
      gap: 20px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    .form-column {
      flex: 1;
      min-width: 150px;
    }

    .form-column label {
      display: block;
      font-weight: bold;
      margin-bottom: 5px;
      color: #333;
    }

    .form-control {
      width: 100%;
      padding: 8px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 14px;
    }

    .form-control:focus {
      outline: none;
      border-color: #007bff;
      box-shadow: 0 0 5px rgba(0, 123, 255, 0.5);
    }

    small {
      display: block;
      color: #666;
      font-size: 12px;
      margin-top: 3px;
    }

    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
    }

    .btn-primary {
      background: #28a745;
      color: white;
    }

    .btn-primary:hover {
      background: #218838;
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-secondary:hover {
      background: #5a6268;
    }

    .info-box {
      margin-top: 30px;
      background: white;
      padding: 20px;
      border-radius: 8px;
      border: 1px solid #ddd;
    }

    .info-box h3 {
      margin-top: 0;
      color: #333;
    }

    .simulation {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }

    .sim-input {
      flex: 1;
      min-width: 150px;
    }

    .sim-input label {
      display: block;
      font-weight: bold;
      margin-bottom: 5px;
    }

    .sim-input input {
      width: 100%;
    }

    .sim-results {
      flex: 1;
      min-width: 250px;
      background: #f0f8ff;
      padding: 15px;
      border-radius: 4px;
      border-left: 4px solid #007bff;
    }

    .result-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #e0e0e0;
    }

    .result-row:last-child {
      border-bottom: none;
    }

    .result-row.loss {
      color: #dc3545;
    }

    .result-row.success {
      color: #28a745;
      font-weight: bold;
    }

    .result-row .indent {
      margin-left: 20px;
    }

    .result-row strong {
      font-weight: bold;
      min-width: 100px;
      text-align: right;
    }
  `]
})
export class RaceGeneticsComponent implements OnInit {
  races: any[] = [];
  selectedRaceId: number | string = '';
  form!: FormGroup;
  simulationOeufs: number = 1000;

  constructor(
    private apiService: ApiService,
    private messageService: MessageService,
    private fb: FormBuilder
  ) {}

  ngOnInit() {
    this.loadRaces();
    this.initForm();
  }

  initForm() {
    this.form = this.fb.group({
      taux_perte_oeufs: [30, [Validators.required, Validators.min(0), Validators.max(100)]],
      ratio_male_femelle: [30, [Validators.required, Validators.min(0), Validators.max(100)]],
      capacite_ponte: [null]
    });
  }

  loadRaces() {
    this.apiService.getRaces().subscribe({
      next: (races) => {
        this.races = races;
      },
      error: (err) => {
        this.messageService.error('Erreur lors du chargement des races');
        console.error(err);
      }
    });
  }

  onRaceSelected() {
    if (this.selectedRaceId) {
      this.apiService.getRaceGenetics(Number(this.selectedRaceId)).subscribe({
        next: (genetics) => {
          this.form.patchValue({
            taux_perte_oeufs: genetics.taux_perte_oeufs,
            ratio_male_femelle: genetics.ratio_male_femelle,
            capacite_ponte: genetics.capacite_ponte
          });
        },
        error: (err) => {
          console.error(err);
        }
      });
    }
  }

  onSubmit() {
    if (this.form.valid && this.selectedRaceId) {
      this.apiService.updateRaceGenetics(Number(this.selectedRaceId), this.form.value).subscribe({
        next: () => {
          this.messageService.success('Paramètres génétiques sauvegardés');
        },
        error: (err) => {
          this.messageService.error('Erreur lors de la sauvegarde');
          console.error(err);
        }
      });
    }
  }

  onReset() {
    this.onRaceSelected();
  }

  calculateOeufsPertes(): number {
    return Math.round(this.simulationOeufs * (this.form.get('taux_perte_oeufs')?.value || 30) / 100);
  }

  calculateOeufsEclos(): number {
    return this.simulationOeufs - this.calculateOeufsPertes();
  }

  calculateMales(): number {
    return Math.round(this.calculateOeufsEclos() * (this.form.get('ratio_male_femelle')?.value || 30) / 100);
  }

  calculateFemelles(): number {
    return this.calculateOeufsEclos() - this.calculateMales();
  }
}
