export type Permission = 'export' | 'read' | 'write' | 'delete' | 'edit';

export interface BatchPermission {
  batch_id: number;
  batch_name: string;
  description: string | null;
  permissions: Permission[];
}

export type UserRole = 'admin' | 'user';

export interface UserDto {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  batch_permissions: BatchPermission[];
}

export interface UserInfoDto {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
}

export interface UserCreateDto {
  email: string;
  password: string;
  full_name: string;
}

export type BatchPermissionUpdateDto = {
  batch_id: number;
  permissions: Permission[];
};

export interface UserUpdateDto {
  full_name?: string | null;
  role?: UserRole | null;
  batch_permissions?: BatchPermissionUpdateDto[] | null;
}
