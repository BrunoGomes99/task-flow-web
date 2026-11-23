import type { LoginResponse, RegisterUserResponse, UserDto } from '../api/api-models';
import type { LoginResult, RegisterResult, UserProfile } from './auth-models';

export function toLoginResult(dto: LoginResponse): LoginResult {
  return {
    accessToken: requiredText(dto.accessToken, 'accessToken'),
    expiresInSeconds: requiredNumber(dto.expiresIn, 'expiresIn'),
  };
}

export function toRegisterResult(dto: RegisterUserResponse): RegisterResult {
  return {
    id: requiredText(dto.id, 'id'),
  };
}

export function toUserProfile(dto: UserDto): UserProfile {
  return {
    id: requiredText(dto.id, 'id'),
    name: requiredText(dto.name, 'name'),
    email: requiredText(dto.email, 'email'),
  };
}

function requiredText(value: string | null | undefined, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Auth response is missing ${field}.`);
  }

  return value;
}

function requiredNumber(value: number | undefined, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Auth response is missing ${field}.`);
  }

  return value;
}
