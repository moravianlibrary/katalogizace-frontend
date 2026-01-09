export interface UserDto {
  email: string;
  full_name: string;
  roles: ('admin' | 'user')[];
  permissions: ('read' | 'write' | 'delete' | 'save')[];
}

export interface CurrentUserDto {
  email: string;
  full_name: string;
  roles: string[];
  permissions: string[];
}
