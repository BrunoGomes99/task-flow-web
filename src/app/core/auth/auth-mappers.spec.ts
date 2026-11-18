import type { LoginResponse, RegisterUserResponse, UserDto } from '../api/api-models';
import { toLoginResult, toRegisterResult, toUserProfile } from './auth-mappers';

describe('toLoginResult', () => {
  it('maps the token and renames expiresIn to seconds', () => {
    const dto: LoginResponse = { accessToken: 'token-1', expiresIn: 3600 };

    expect(toLoginResult(dto)).toEqual({
      accessToken: 'token-1',
      expiresInSeconds: 3600,
    });
  });

  it('keeps a zero expiry instead of treating it as missing', () => {
    expect(toLoginResult({ accessToken: 'token-1', expiresIn: 0 })).toEqual({
      accessToken: 'token-1',
      expiresInSeconds: 0,
    });
  });

  it('rejects a login body without an access token', () => {
    expect(() => toLoginResult({ expiresIn: 60 })).toThrow(/accessToken/);
    expect(() => toLoginResult({ accessToken: null, expiresIn: 60 })).toThrow(/accessToken/);
    expect(() => toLoginResult({ accessToken: '', expiresIn: 60 })).toThrow(/accessToken/);
  });

  it('rejects a login body without expiresIn', () => {
    expect(() => toLoginResult({ accessToken: 'token-1' })).toThrow(/expiresIn/);
  });
});

describe('toRegisterResult', () => {
  it('maps the created user id', () => {
    const dto: RegisterUserResponse = { id: 'user-1' };

    expect(toRegisterResult(dto)).toEqual({ id: 'user-1' });
  });

  it('rejects a register body without an id', () => {
    expect(() => toRegisterResult({})).toThrow(/id/);
  });
});

describe('toUserProfile', () => {
  it('maps id, name and email and drops createdAt', () => {
    const dto: UserDto = {
      id: 'user-1',
      name: 'Ana Silva',
      email: 'ana@example.com',
      createdAt: '2026-11-18T12:00:00Z',
    };

    expect(toUserProfile(dto)).toEqual({
      id: 'user-1',
      name: 'Ana Silva',
      email: 'ana@example.com',
    });
  });

  it('rejects a profile missing name or email', () => {
    const base: UserDto = { id: 'user-1', name: 'Ana Silva', email: 'ana@example.com' };

    expect(() => toUserProfile({ ...base, name: null })).toThrow(/name/);
    expect(() => toUserProfile({ ...base, email: '' })).toThrow(/email/);
    expect(() => toUserProfile({ ...base, id: undefined })).toThrow(/id/);
  });
});
