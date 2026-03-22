import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary" *ngIf="authService.isAuthenticated()">
      <div class="container-fluid">
        <a class="navbar-brand" routerLink="/dashboard">
          <img src="assets/logo.svg" alt="IntelliDesk" height="32" />
          IntelliDesk
        </a>
        <div class="navbar-nav me-auto">
          <a class="nav-link" routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
          <a class="nav-link" routerLink="/tickets" routerLinkActive="active">Tickets</a>
          <a class="nav-link" routerLink="/customers" routerLinkActive="active">Customers</a>
        </div>
        <div class="navbar-nav ms-auto">
          <span class="nav-link text-light">{{ currentUser()?.email }}</span>
          <a class="nav-link" (click)="onLogout()" role="button">Logout</a>
        </div>
      </div>
    </nav>

    <main class="container-fluid mt-3">
      <router-outlet />
    </main>
  `,
  styles: [`
    .navbar-brand {
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .navbar-brand img {
      margin-right: 8px;
    }
    main {
      max-width: 1400px;
      margin: 0 auto;
    }
  `]
})
export class AppComponent {
  readonly authService = inject(AuthService);
  readonly currentUser = this.authService.getCurrentUser;

  onLogout(): void {
    this.authService.logout();
  }
}
