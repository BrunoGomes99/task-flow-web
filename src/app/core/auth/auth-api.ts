import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';

import { API_BASE_URL } from '../api/api-base-url';
import type {
  LoginResponse,
  LoginUserRequest,
  RegisterUserRequest,
  RegisterUserResponse,
  UserDto,
} from '../api/api-models';
import { toLoginResult, toRegisterResult, toUserProfile } from './auth-mappers';
import type {
  LoginInput,
  LoginResult,
  RegisterInput,
  RegisterResult,
  UserProfile,
} from './auth-models';

@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  register(input: RegisterInput): Observable<RegisterResult> {
    const body: RegisterUserRequest = {
      name: input.name,
      email: input.email,
      password: input.password,
    };

    return this.http
      .post<RegisterUserResponse>(this.url('/api/users/register'), body)
      .pipe(map(toRegisterResult));
  }

  login(input: LoginInput): Observable<LoginResult> {
    const body: LoginUserRequest = {
      email: input.email,
      password: input.password,
    };

    return this.http
      .post<LoginResponse>(this.url('/api/users/login'), body)
      .pipe(map(toLoginResult));
  }

  getProfile(): Observable<UserProfile> {
    return this.http.get<UserDto>(this.url('/api/users/me')).pipe(map(toUserProfile));
  }

  private url(path: string): string {
    return `${this.baseUrl}${path}`;
  }
}
