import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { tap } from 'rxjs/operators';
import { EnvironmentService } from '../../services/environment.service';

type TokenResponse = { access_token: string; token_type: string };

export type CurrentUser = {
  email: string;
  full_name: string;
  roles: string[];
  permissions: string[];
};

export type RegisterDto = {
  email: string;
  password: string;
  full_name: string;
};

export type LoginDto = {
  email: string;
  password: string;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private env = inject(EnvironmentService);

  private get apiBaseUrl(): string {
    return this.env.get('apiServiceBaseUrl') as string;
  }

  readonly token = signal<string | null>(localStorage.getItem('access_token'));
  readonly isLoggedIn = computed(() => !!this.token());

  readonly user = signal<CurrentUser | null>(null);
  readonly userEmail = computed(() => this.user()?.email ?? null);
  readonly userName = computed(() => this.user()?.full_name ?? null);

  setToken(token: string | null) {
    this.token.set(token);
    token
      ? localStorage.setItem('access_token', token)
      : localStorage.removeItem('access_token');
  }

  register(dto: RegisterDto) {
    return this.http.post(`${this.apiBaseUrl}/users/register`, dto);
  }

  login(dto: LoginDto) {
    const body = new HttpParams()
      .set('username', dto.email)
      .set('password', dto.password);

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
      Bearer: this.env.get('apiServiceKey'),
    });

    return this.http
      .post<TokenResponse>(`${this.apiBaseUrl}/users/login`, body.toString(), {
        headers,
      })
      .pipe(
        tap((r) => this.setToken(r.access_token)),
        tap(() => {
          this.loadCurrentUser().subscribe({
            error: () => {
              this.user.set(null);
            },
          });
        }),
      );
  }

  loadCurrentUser() {
    return this.http
      .get<CurrentUser>(`${this.apiBaseUrl}/users/current-user`)
      .pipe(tap((u) => this.user.set(u)));
  }

  logout() {
    this.setToken(null);
    this.user.set(null);
  }
}
