import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard],
  },
  {
    path: 'tickets',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/tickets/ticket-list/ticket-list.component').then(m => m.TicketListComponent),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./features/tickets/ticket-detail/ticket-detail.component').then(m => m.TicketDetailComponent),
      },
    ],
  },
  {
    path: 'customers',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/customers/customer-list.component').then(m => m.CustomerListComponent),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./features/customers/customer-detail.component').then(m => m.CustomerDetailComponent),
      },
    ],
  },
  { path: '**', redirectTo: '/dashboard' },
];
