import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TicketPriority } from '../../core/models/ticket.model';

@Component({
  selector: 'app-priority-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="badge" [ngClass]="badgeClass">{{ priority | titlecase }}</span>
  `,
  styles: [`
    .priority-critical { background-color: #dc3545; }
    .priority-high { background-color: #fd7e14; }
    .priority-medium { background-color: #ffc107; color: #212529; }
    .priority-low { background-color: #28a745; }
  `],
})
export class PriorityBadgeComponent {
  @Input({ required: true }) priority!: TicketPriority;

  get badgeClass(): string {
    return `priority-${this.priority}`;
  }
}
