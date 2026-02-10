export interface User {
  id: string;
  email: string;
  role: 'admin' | 'employee';
  position: string;
  name?: string;
}