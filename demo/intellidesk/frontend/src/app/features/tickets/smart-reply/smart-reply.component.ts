import { Component, Input, Output, EventEmitter, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { NotificationService } from '../../../core/services/notification.service';

interface SmartReplyResponse {
  suggestedReply: string;
  confidence: number;
  reasoning: string;
  sources: string[];
}

@Component({
  selector: 'app-smart-reply',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './smart-reply.component.html',
})
export class SmartReplyComponent implements OnInit {
  @Input({ required: true }) ticketId!: string;
  @Output() accepted = new EventEmitter<string>();
  @Output() dismissed = new EventEmitter<void>();

  private readonly api = inject(ApiService);
  private readonly notify = inject(NotificationService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  suggestedReply = '';
  confidence = 0;
  reasoning = '';

  ngOnInit(): void {
    this.generateReply();
  }

  generateReply(): void {
    this.loading.set(true);
    this.error.set(null);

    this.api.post<SmartReplyResponse>(`/tickets/${this.ticketId}/smart-reply`, {}).subscribe({
      next: res => {
        this.suggestedReply = res.suggestedReply;
        this.confidence = Math.round(res.confidence * 100);
        this.reasoning = res.reasoning;
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err.message || 'Failed to generate smart reply');
        this.loading.set(false);
      },
    });
  }

  useReply(): void {
    this.accepted.emit(this.suggestedReply);
    this.notify.success('Smart reply applied');
  }

  dismiss(): void {
    this.dismissed.emit();
  }
}
