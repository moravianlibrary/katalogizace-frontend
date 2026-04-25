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
