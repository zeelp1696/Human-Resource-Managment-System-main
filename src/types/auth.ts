export type UserRole = 'admin' | 'hr' | 'manager' | 'employee';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  department?: string;
  position?: string;
  name?: string;
  username?: string;
  avatar?: string;
  needsPasswordChange?: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
}