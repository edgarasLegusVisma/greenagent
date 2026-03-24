import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Ticket, TicketComment, TicketStatus } from '../../../core/models/ticket.model';
import { PriorityBadgeComponent } from '../../../shared/components/priority-badge.component';
import { SentimentIndicatorComponent } from '../../../shared/components/sentiment-indicator.component';
import { SmartReplyComponent } from '../smart-reply/smart-reply.component';
import { TimeAgoPipe } from '../../../shared/pipes/time-ago.pipe';

@Component({
  selector: 'app-ticket-detail',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule,
    PriorityBadgeComponent, SentimentIndicatorComponent, SmartReplyComponent, TimeAgoPipe,
  ],
  templateUrl: './ticket-detail.component.html',
})
export class TicketDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly notify = inject(NotificationService);

  readonly ticket = signal<Ticket | null>(null);
  readonly loading = signal(true);
  readonly summarizing = signal(false);
  readonly showSmartReply = signal(false);

  newComment = '';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.api.get<Ticket>(`/tickets/${id}`).subscribe({
      next: t => { this.ticket.set(t); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  addComment(): void {
    const t = this.ticket();
    if (!t || !this.newComment.trim()) return;
    this.api.post<TicketComment>(`/tickets/${t.id}/comments`, { body: this.newComment, isInternal: false }).subscribe({
      next: comment => {
        this.ticket.set({ ...t, comments: [...t.comments, comment] });
        this.newComment = '';
        this.notify.success('Comment added');
      },
      error: () => this.notify.error('Failed to add comment'),
    });
  }

  updateStatus(status: TicketStatus): void {
    const t = this.ticket();
    if (!t) return;
    this.api.put<Ticket>(`/tickets/${t.id}`, { status }).subscribe({
      next: updated => { this.ticket.set(updated); this.notify.success(`Ticket ${status.replace(/_/g, ' ')}`); },
      error: () => this.notify.error('Failed to update status'),
    });
  }

  autoSummarize(): void {
    const t = this.ticket();
    if (!t) return;
    this.summarizing.set(true);
    this.api.post<{ summary: string }>(`/tickets/${t.id}/summarize`, {}).subscribe({
      next: res => { this.ticket.set({ ...t, aiSummary: res.summary }); this.summarizing.set(false); },
      error: () => { this.notify.error('Summarization failed'); this.summarizing.set(false); },
    });
  }

  onSmartReplyAccepted(reply: string): void {
    this.newComment = reply;
    this.showSmartReply.set(false);
  }
}
