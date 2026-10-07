import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AdminCredentials, AdminLoginResponse } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly session = signal<AdminLoginResponse | null>(null);
  readonly currentUser = computed(() => this.hasSession() ? this.session()?.user ?? null : null);

  isAuthenticated(): boolean {
    return this.hasSession();
  }

  accessToken(): string | null {
    return this.hasSession() ? this.session()?.accessToken ?? null : null;
  }

  login(credentials: AdminCredentials) {
    return this.http.post<AdminLoginResponse>(`${environment.apiBaseUrl}/auth/login`, credentials).pipe(
      tap((response) => this.session.set(response))
    );
  }

  logout(): void {
    this.session.set(null);
  }

  private hasSession(): boolean {
    const session = this.session();
    if (!session || Date.parse(session.expiresAt) <= Date.now()) {
      this.session.set(null);
      return false;
    }
    return true;
  }
}
