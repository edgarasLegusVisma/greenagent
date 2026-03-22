import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { Customer } from '../../core/models/customer.model';
import { Ticket } from '../../core/models/ticket.model';
import { SentimentIndicatorComponent } from '../../shared/components/sentiment-indicator.component';
import { PriorityBadgeComponent } from '../../shared/components/priority-badge.component';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';

@Component({
  selector: 'app-customer-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, SentimentIndicatorComponent, PriorityBadgeComponent, TimeAgoPipe],
  template: `
    <div *ngIf="loading()" class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
    </div>

    <div *ngIf="customer() as c" class="customer-detail">
      <nav aria-label="breadcrumb" class="mb-3">
        <ol class="breadcrumb">
          <li class="breadcrumb-item"><a routerLink="/customers">Customers</a></li>
          <li class="breadcrumb-item active">{{ c.firstName }} {{ c.lastName }}</li>
        </ol>
      </nav>

      <div class="card mb-4">
        <div class="card-body">
          <div class="d-flex align-items-center gap-3">
            <img [src]="c.avatarUrl || 'assets/default-avatar.png'" class="rounded-circle" width="64" height="64" alt="Avatar" />
            <div>
              <h2 class="mb-0">{{ c.firstName }} {{ c.lastName }}</h2>
              <p class="text-muted mb-0">{{ c.email }} · {{ c.company || 'No company' }}</p>
            </div>
            <div class="ms-auto text-end">
              <span class="badge bg-primary fs-6">{{ c.tier | titlecase }}</span>
              <div class="mt-1"><app-sentiment-indicator [sentiment]="c.overallSentiment" /></div>
            </div>
          </div>
          <hr />
          <div class="row text-center">
            <div class="col"><strong>{{ c.totalTickets }}</strong><br /><small class="text-muted">Total Tickets</small></div>
            <div class="col"><strong class="text-danger">{{ c.openTickets }}</strong><br /><small class="text-muted">Open</small></div>
            <div class="col"><strong>{{ c.averageResolutionHours.toFixed(1) }}h</strong><br /><small class="text-muted">Avg Resolution</small></div>
            <div class="col"><strong>{{ c.lastContactAt | timeAgo }}</strong><br /><small class="text-muted">Last Contact</small></div>
          </div>
        </div>
      </div>

      <!-- Ticket History -->
      <h4 class="mb-3">Ticket History</h4>
      <div class="table-responsive">
        <table class="table table-hover align-middle">
          <thead class="table-light">
            <tr><th>Title</th><th>Status</th><th>Priority</th><th>Created</th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let t of tickets()" [routerLink]="['/tickets', t.id]" class="cursor-pointer">
              <td>{{ t.title }}</td>
              <td><span class="badge bg-secondary">{{ t.status }}</span></td>
              <td><app-priority-badge [priority]="t.priority" /></td>
              <td>{{ t.createdAt | timeAgo }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class CustomerDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);

  readonly customer = signal<Customer | null>(null);
  readonly tickets = signal<Ticket[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.api.get<Customer>(`/customers/${id}`).subscribe({
      next: c => { this.customer.set(c); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.api.get<{ items: Ticket[] }>(`/customers/${id}/tickets`).subscribe({
      next: res => this.tickets.set(res.items),
    });
  }
}
