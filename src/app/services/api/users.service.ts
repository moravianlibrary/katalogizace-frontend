import {
  UserCreateDto,
  UserDto,
  UserInfoDto,
  UserInfoWithPasswdDto,
  UserUpdateDto,
} from '@/app/models';
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { EnvironmentService } from '../environment.service';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private http = inject(HttpClient);
  private env = inject(EnvironmentService);

  private get apiBaseUrl(): string {
    return this.env.get('apiServiceBaseUrl') as string;
  }

  listUsers(view: 'basic'): Observable<UserInfoDto[]>;
  listUsers(view: 'detail'): Observable<UserDto[]>;
  listUsers(view: 'basic' | 'detail' = 'basic') {
    const params = new HttpParams().set('view', view);

    return this.http.get<UserInfoDto[] | UserDto[]>(
      `${this.apiBaseUrl}/users/`,
      { params },
    );
  }

  createUser(dto: UserCreateDto) {
    return this.http.post<UserInfoWithPasswdDto>(
      `${this.apiBaseUrl}/users/register`,
      dto,
    );
  }

  updateUser(userId: number, dto: UserUpdateDto) {
    return this.http.put(`${this.apiBaseUrl}/users/${userId}`, dto);
  }

  deleteUser(userId: number) {
    return this.http.delete(`${this.apiBaseUrl}/users/${userId}`);
  }

  resetUserPassword(userId: number) {
    return this.http.patch<UserInfoWithPasswdDto>(
      `${this.apiBaseUrl}/users/${userId}/reset-password`,
      null,
    );
  }
}
