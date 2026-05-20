import { BatchPermissionUpdateDto } from './user.dto';

export interface TokenDto {
  access_token: string;
  token_type: string;
}

export interface UserCreateDto {
  email: string;
  full_name: string;
  permissions?: BatchPermissionUpdateDto[];
}

export interface LoginDto {
  email: string;
  password: string;
}
