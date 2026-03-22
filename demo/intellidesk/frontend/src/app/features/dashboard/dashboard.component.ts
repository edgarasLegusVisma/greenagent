import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

interface DashboardStats {
  openTickets: number;
  resolvedToday: number;
  avgResolutionTimeHours: number;
  customerSatisfactionScore: number;
  ticketsByPriority: Record<string, number>;
}

interface SentimentOverview {
  positive: number;
  neutral: number;
  negative: number;
  trend: 'improving' | 'stable' | 'declining';
  averageScore: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(ApiService);

  readonly stats = signal<DashboardStats | null>(null);
  readonly sentiment = signal<SentimentOverview | null>(null);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.loadDashboard();
  }

  private loadDashboard(): void {
    this.api.get<DashboardStats>('/dashboard/stats').subscribe({
      next: data => this.stats.set(data),
      error: () => console.error('Failed to load dashboard stats'),
    });

    this.api.get<SentimentOverview>('/dashboard/sentiment-overview').subscribe({
      next: data => { this.sentiment.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  formatHours(hours: number): string {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${hours.toFixed(1)}h`;
    return `${(hours / 24).toFixed(1)}d`;
  }

  getSentimentTrendIcon(trend: string): string {
    switch (trend) {
      case 'improving': return 'trending_up';
      case 'declining': return 'trending_down';
      default: return 'trending_flat';
    }
  }
}
