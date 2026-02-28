import type { UserRole } from '@/types/experience';

export type PermissionKey =
  | 'viewStudentSpace'
  | 'viewTeacherSpace'
  | 'viewParentSpace'
  | 'manageCourses'
  | 'viewChildProgress';

const rolePermissions: Record<UserRole, PermissionKey[]> = {
  student: ['viewStudentSpace'],
  teacher: ['viewTeacherSpace', 'manageCourses'],
  parent: ['viewParentSpace', 'viewChildProgress'],
  admin: ['viewStudentSpace', 'viewTeacherSpace', 'viewParentSpace', 'manageCourses', 'viewChildProgress'],
};

export function hasPermission(role: UserRole, permission: PermissionKey): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}
