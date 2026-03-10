// Centralized role-based permission checks
// Maps to the employees.role CHECK constraint: ('employee','hr','manager','admin')

import type { UserRole } from '../types/auth';

// ─── Permission checks matching the agreed permission matrix ───

/** Admin + HR can add/edit/delete employees */
export const canManageEmployees = (role?: UserRole): boolean =>
  role === 'admin' || role === 'hr';

/** Admin + Manager can create/assign tasks */
export const canManageTasks = (role?: UserRole): boolean =>
  role === 'admin' || role === 'manager';

/** Admin + HR can approve/reject leaves */
export const canApproveLeaves = (role?: UserRole): boolean =>
  role === 'admin' || role === 'hr';

/** Admin + HR + Manager can view reports */
export const canViewReports = (role?: UserRole): boolean =>
  role === 'admin' || role === 'hr' || role === 'manager';

/** Only Admin can access system settings */
export const canManageSettings = (role?: UserRole): boolean =>
  role === 'admin';

/** Admin + HR + Manager get full sidebar (not employee) */
export const hasSidebarAccess = (role?: UserRole): boolean =>
  role === 'admin' || role === 'hr' || role === 'manager';

/** Human-readable role label */
export const getRoleLabel = (role?: UserRole): string => {
  switch (role) {
    case 'admin': return 'Admin';
    case 'hr': return 'HR';
    case 'manager': return 'Manager';
    case 'employee': return 'Employee';
    default: return 'Unknown';
  }
};

/** Role badge color class for UI */
export const getRoleBadgeVariant = (role?: UserRole): string => {
  switch (role) {
    case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'hr': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'manager': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
    case 'employee': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
  }
};
