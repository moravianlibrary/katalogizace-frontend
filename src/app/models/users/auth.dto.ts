export interface TokenDto {
  access_token: string;
  token_type: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  full_name: string;
}

export interface LoginDto {
  email: string;
  password: string;
}
