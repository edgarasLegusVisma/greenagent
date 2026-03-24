import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { Ticket, TicketListResponse, TicketStatus, TicketPriority } from '../../../core/models/ticket.model';
import { PriorityBadgeComponent } from '../../../shared/components/priority-badge.component';
import { SentimentIndicatorComponent } from '../../../shared/components/sentiment-indicator.component';
import { TimeAgoPipe } from '../../../shared/pipes/time-ago.pipe';

@Component({
  selector: 'app-ticket-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, PriorityBadgeComponent, SentimentIndicatorComponent, TimeAgoPipe],
  templateUrl: './ticket-list.component.html',
})
export class TicketListComponent implements OnInit {
  private readonly api = inject(ApiService);

  readonly tickets = signal<Ticket[]>([]);
  readonly totalCount = signal(0);
  readonly loading = signal(true);

  searchQuery = '';
  statusFilter: TicketStatus | '' = '';
  priorityFilter: TicketPriority | '' = '';
  currentPage = 1;
  readonly pageSize = 20;

  readonly totalPages = computed(() => Math.ceil(this.totalCount() / this.pageSize));

  readonly statusOptions: TicketStatus[] = ['open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed'];
  readonly priorityOptions: TicketPriority[] = ['critical', 'high', 'medium', 'low'];

  ngOnInit(): void {
    this.loadTickets();
  }

  loadTickets(): void {
    this.loading.set(true);
    const params: Record<string, string | number> = {
      page: this.currentPage,
      pageSize: this.pageSize,
    };
    if (this.searchQuery) params['search'] = this.searchQuery;
    if (this.statusFilter) params['status'] = this.statusFilter;
    if (this.priorityFilter) params['priority'] = this.priorityFilter;

    this.api.get<TicketListResponse>('/tickets', params).subscribe({
      next: response => {
        this.tickets.set(response.items);
        this.totalCount.set(response.totalCount);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadTickets();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadTickets();
  }

  getStatusLabel(status: TicketStatus): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
}
