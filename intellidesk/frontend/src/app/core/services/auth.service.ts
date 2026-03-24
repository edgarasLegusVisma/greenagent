import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'agent' | 'supervisor' | 'admin';
  avatarUrl?: string;
}

interface LoginResponse {
  token: string;
  refreshToken: string;
  user: AuthUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly TOKEN_KEY = 'intellidesk_token';
  private readonly REFRESH_KEY = 'intellidesk_refresh';

  private readonly _currentUser = signal<AuthUser | null>(this.loadUserFromStorage());

  readonly getCurrentUser = computed(() => this._currentUser());

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, { email, password }).pipe(
      tap(response => {
        localStorage.setItem(this.TOKEN_KEY, response.token);
        localStorage.setItem(this.REFRESH_KEY, response.refreshToken);
        localStorage.setItem('intellidesk_user', JSON.stringify(response.user));
        this._currentUser.set(response.user);
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
    localStorage.removeItem('intellidesk_user');
    this._currentUser.set(null);
    this.router.navigate(['/login']);
  }

  private loadUserFromStorage(): AuthUser | null {
    const raw = localStorage.getItem('intellidesk_user');
    return raw ? JSON.parse(raw) : null;
  }
}
