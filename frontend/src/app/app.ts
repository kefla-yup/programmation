import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageService } from './services/message.service';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { ConfigPoidsComponent } from './components/config-poids/config-poids.component';
import { ConfigPrixComponent } from './components/config-prix/config-prix.component';
import { LotsComponent } from './components/lots/lots.component';
import { OeufsComponent } from './components/oeufs/oeufs.component';
import { TransformationComponent } from './components/transformation/transformation.component';
import { MortaliteComponent } from './components/mortalite/mortalite.component';
import { StockComponent } from './components/stock/stock.component';
import { RacesComponent } from './components/races/races.component';
import { PoidsPouletComponent } from './components/poids-poulet/poids-poulet.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    SidebarComponent,
    ConfigPoidsComponent,
    ConfigPrixComponent,
    LotsComponent,
    OeufsComponent,
    TransformationComponent,
    MortaliteComponent,
    StockComponent,
    RacesComponent,
    PoidsPouletComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  currentView = 'stock';
  sidebarOpen = false;

  constructor(public msg: MessageService) {}

  setView(view: string): void {
    this.currentView = view;
    this.msg.clear();
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }
}
