import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { tap } from 'rxjs/operators';
import { EnvironmentService } from '../services/environment.service';

type TokenResponse = { access_token: string; token_type: string };

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

  private apiBaseUrl = this.env.get('apiServiceBaseUrl');

  readonly token = signal<string | null>(localStorage.getItem('access_token'));
  readonly isLoggedIn = computed(() => !!this.token());

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
      .pipe(tap((r) => this.setToken(r.access_token)));
  }

  logout() {
    this.setToken(null);
  }
}
