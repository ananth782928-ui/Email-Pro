import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthResponse, UpdateSettingsPayload, User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private readonly TOKEN_KEY = 'emailpro_jwt_token';
  private readonly USER_KEY = 'emailpro_user';

  currentUser = signal<User | null>(this.getStoredUser());
  token = signal<string | null>(this.getStoredToken());
  isAuthenticated = computed(() => !!this.token());

  register(payload: { email: string; password: string; fullName: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register`, payload).pipe(
      tap(response => this.handleAuthSuccess(response))
    );
  }

  login(payload: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, payload).pipe(
      tap(response => this.handleAuthSuccess(response))
    );
  }

  fetchProfile(): Observable<User> {
    return this.http.get<User>(`${environment.apiUrl}/auth/me`).pipe(
      tap(user => {
        this.currentUser.set(user);
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      })
    );
  }

  updateSettings(payload: UpdateSettingsPayload): Observable<User> {
    return this.http.put<User>(`${environment.apiUrl}/auth/settings`, payload).pipe(
      tap(updatedUser => {
        this.currentUser.set(updatedUser);
        localStorage.setItem(this.USER_KEY, JSON.stringify(updatedUser));
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUser.set(null);
    this.token.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this.token();
  }

  private handleAuthSuccess(res: AuthResponse): void {
    localStorage.setItem(this.TOKEN_KEY, res.token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
    this.token.set(res.token);
    this.currentUser.set(res.user);
  }

  private getStoredToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private getStoredUser(): User | null {
    const raw = localStorage.getItem(this.USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  }
}
