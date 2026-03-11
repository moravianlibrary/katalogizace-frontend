export type UserPermission = 'read' | 'write' | 'delete' | 'save';
export type UserRole = 'admin' | 'user';

export interface UserDto {
  email: string;
  full_name: string;
  roles: UserRole[];
  permissions: UserPermission[];
}

export interface CurrentUserDto {
  email: string;
  full_name: string;
  roles: string[];
  permissions: string[];
}
