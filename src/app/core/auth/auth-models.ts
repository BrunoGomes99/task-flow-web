export interface UserProfile {
  id: string;
  name: string;
  email: string;
}

export interface LoginResult {
  accessToken: string;
  expiresInSeconds: number;
}

export interface RegisterResult {
  id: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}
