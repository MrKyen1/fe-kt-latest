import { StoredUser } from "../services/tokenStorage";

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface AuthResponse {
  user: StoredUser;
  accessToken: string;
  refreshToken: string;
}

export interface UpdateMeRequest {
  fullName?: string;
  phone?: string;
  email?: string;
  address?: string;
  avatar?: string;
  code?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ResetPasswordRequest {
  identifier: string;
}

export interface ResetPasswordResponse {
  password: string;
}

