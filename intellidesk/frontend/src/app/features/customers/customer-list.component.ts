import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { CustomerSummary, CustomerListResponse } from '../../core/models/customer.model';
import { SentimentIndicatorComponent } from '../../shared/components/sentiment-indicator.component';

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, SentimentIndicatorComponent],
  template: `
    <div class="customer-list-container">
      <h1 class="mb-4">Customers</h1>

      <div class="input-group mb-3" style="max-width: 400px">
        <input
          type="text"
          class="form-control"
          placeholder="Search customers..."
          [(ngModel)]="searchQuery"
          (keyup.enter)="onSearch()"
        />
        <button class="btn btn-outline-primary" (click)="onSearch()">Search</button>
      </div>

      <div *ngIf="loading()" class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
      </div>

      <div class="table-responsive" *ngIf="!loading()">
        <table class="table table-hover align-middle">
          <thead class="table-light">
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Company</th>
              <th>Tier</th>
              <th>Open Tickets</th>
              <th>Sentiment</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let c of customers()" [routerLink]="['/customers', c.id]" class="cursor-pointer">
              <td class="fw-semibold">{{ c.fullName }}</td>
              <td>{{ c.email }}</td>
              <td>{{ c.company || '—' }}</td>
              <td><span class="badge bg-outline-secondary">{{ c.tier | titlecase }}</span></td>
              <td><span [class.text-danger]="c.openTickets > 0">{{ c.openTickets }}</span></td>
              <td><app-sentiment-indicator [sentiment]="c.overallSentiment" /></td>
            </tr>
          </tbody>
        </table>
      </div>

      <nav *ngIf="totalPages() > 1" aria-label="Customer pagination">
        <ul class="pagination justify-content-center">
          <li class="page-item" [class.disabled]="currentPage === 1">
            <a class="page-link" (click)="onPageChange(currentPage - 1)">Previous</a>
          </li>
          <li class="page-item" [class.disabled]="currentPage === totalPages()">
            <a class="page-link" (click)="onPageChange(currentPage + 1)">Next</a>
          </li>
        </ul>
      </nav>
    </div>
  `,
})
export class CustomerListComponent implements OnInit {
  private readonly api = inject(ApiService);

  readonly customers = signal<CustomerSummary[]>([]);
  readonly totalCount = signal(0);
  readonly loading = signal(true);

  searchQuery = '';
  currentPage = 1;
  readonly pageSize = 25;
  readonly totalPages = computed(() => Math.ceil(this.totalCount() / this.pageSize));

  ngOnInit(): void {
    this.loadCustomers();
  }

  loadCustomers(): void {
    this.loading.set(true);
    const params: Record<string, string | number> = { page: this.currentPage, pageSize: this.pageSize };
    if (this.searchQuery) params['search'] = this.searchQuery;

    this.api.get<CustomerListResponse>('/customers', params).subscribe({
      next: res => { this.customers.set(res.items); this.totalCount.set(res.totalCount); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  onSearch(): void { this.currentPage = 1; this.loadCustomers(); }
  onPageChange(page: number): void { this.currentPage = page; this.loadCustomers(); }
}
