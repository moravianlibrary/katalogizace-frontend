import { Permission } from '@/app/models';

type PermissionListItem = {
  permissions: Permission[];
};

export function normalizePermissions(permissions: Permission[]): Permission[] {
  return Array.from(new Set(permissions)).sort() as Permission[];
}

export function permissionsEqual(a: Permission[], b: Permission[]): boolean {
  const left = normalizePermissions(a);
  const right = normalizePermissions(b);

  return (
    left.length === right.length &&
    left.every((permission, index) => permission === right[index])
  );
}

export function permissionListsEqual<T extends PermissionListItem>(
  a: T[],
  b: T[],
  getId: (item: T) => number,
): boolean {
  const normalize = (items: T[]) =>
    items
      .filter((item) => item.permissions.length > 0)
      .map((item) => ({
        id: getId(item),
        permissions: normalizePermissions(item.permissions),
      }))
      .sort((x, y) => x.id - y.id);

  const left = normalize(a);
  const right = normalize(b);

  if (left.length !== right.length) return false;

  return left.every((item, index) => {
    const other = right[index];

    return (
      item.id === other.id &&
      permissionsEqual(item.permissions, other.permissions)
    );
  });
}
