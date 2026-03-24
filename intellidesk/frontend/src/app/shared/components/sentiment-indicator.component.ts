import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SentimentLabel } from '../../core/models/ticket.model';

@Component({
  selector: 'app-sentiment-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="sentiment-indicator" [ngClass]="'sentiment-' + sentiment">
      {{ emojiMap[sentiment] }} {{ labelMap[sentiment] }}
    </span>
  `,
  styles: [`
    .sentiment-indicator {
      font-size: 0.85rem;
      font-weight: 500;
      white-space: nowrap;
    }
    .sentiment-positive { color: #28a745; }
    .sentiment-neutral { color: #6c757d; }
    .sentiment-negative { color: #dc3545; }
  `],
})
export class SentimentIndicatorComponent {
  @Input({ required: true }) sentiment!: SentimentLabel;

  readonly emojiMap: Record<SentimentLabel, string> = {
    positive: '\u{1F60A}',
    neutral: '\u{1F610}',
    negative: '\u{1F620}',
  };

  readonly labelMap: Record<SentimentLabel, string> = {
    positive: 'Positive',
    neutral: 'Neutral',
    negative: 'Negative',
  };
}
