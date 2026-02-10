export interface User {
  id: string;
  email: string;
  role: 'hr' | 'employee';
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

export const mockUsers: User[] = [
  // HR Users
  {
    id: 'hr1',
    username: 'hr.admin',
    name: 'John Doe',
    email: 'john.doe@company.com',
    role: 'hr',
    department: 'Human Resources',
    position: 'HR Manager',
  },
  {
    id: 'hr2',
    username: 'hr.sarah',
    name: 'Sarah Wilson',
    email: 'sarah.wilson@company.com',
    role: 'hr',
    department: 'Human Resources',
    position: 'HR Specialist',
  },
  
  // Employee Users
  {
    id: 'emp1',
    username: 'sarah.johnson',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@company.com',
    role: 'employee',
    department: 'Engineering',
    position: 'Senior Frontend Developer',
  },
  {
    id: 'emp2',
    username: 'michael.chen',
    name: 'Michael Chen',
    email: 'michael.chen@company.com',
    role: 'employee',
    department: 'Engineering',
    position: 'Backend Developer',
  },
  {
    id: 'emp3',
    username: 'emily.rodriguez',
    name: 'Emily Rodriguez',
    email: 'emily.rodriguez@company.com',
    role: 'employee',
    department: 'Design',
    position: 'UX Designer',
  },
];