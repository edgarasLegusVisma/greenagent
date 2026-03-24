import { SentimentLabel } from './ticket.model';

export interface Customer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company?: string;
  phone?: string;
  avatarUrl?: string;
  tier: 'free' | 'starter' | 'professional' | 'enterprise';
  overallSentiment: SentimentLabel;
  totalTickets: number;
  openTickets: number;
  averageResolutionHours: number;
  tags: string[];
  createdAt: string;
  lastContactAt: string;
}

export interface CustomerSummary {
  id: string;
  fullName: string;
  email: string;
  company?: string;
  tier: string;
  openTickets: number;
  overallSentiment: SentimentLabel;
}

export interface CustomerListResponse {
  items: CustomerSummary[];
  totalCount: number;
  page: number;
  pageSize: number;
}
