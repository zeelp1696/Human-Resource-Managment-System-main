export interface Employee {
  id: string;
  name: string;
  email: string;
  department?: string;
  position?: string;
  skills: Skill[];
  experience: number; // years
  availability: number; // percentage
  currentTasks: number;
  joinDate: string;
  phone?: string;
  createdAt?: string;
  address?: string; // Keep for compatibility
}

export interface Skill {
  name: string;
  level: number; // 1-5 scale
  category: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  requiredSkills: RequiredSkill[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'assigned' | 'in-progress' | 'completed' | 'cancelled';
  assigned_to?: string; // employee id
  estimatedHours: number;
  due_date?: string;
  createdBy?: string;
  createdAt?: string;
  completedAt?: string;
  progress: number; // 0-100
}

export interface RequiredSkill {
  name: string;
  level: number; // minimum level required
  importance: 'required' | 'preferred' | 'nice-to-have';
}

export interface Department {
  id: string;
  name: string;
  head: string;
  employeeCount: number;
  description: string;
}

export interface Attendance {
  id: string;
  employeeId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: 'present' | 'absent' | 'late' | 'half-day';
  hours: number;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: 'sick' | 'vacation' | 'personal' | 'emergency';
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface SkillMatch {
  employee: Employee;
  matchScore: number;
  matchedSkills: Skill[];
  missingSkills: RequiredSkill[];
  availabilityScore: number;
}