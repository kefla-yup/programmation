import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.component.html'
})
export class SidebarComponent {
  @Input() currentView = 'stock';
  @Input() sidebarOpen = false;
  @Output() viewChange = new EventEmitter<string>();
  @Output() sidebarClose = new EventEmitter<void>();

  setView(view: string): void {
    this.viewChange.emit(view);
    if (window.innerWidth < 768) {
      this.sidebarClose.emit();
    }
  }
}
