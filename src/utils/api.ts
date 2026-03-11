// src/lib/api.ts
import { supabase } from "../supabase";
import { User } from "../types/auth";
import { hashPassword, verifyPassword } from './passwordUtils';
import { generateTempPassword } from './passwordGenerator';
import { sendWelcomeEmail } from './emailService';
import { saveSession } from './sessionUtils';

// ---------------- TYPES ----------------
export interface ApiUser {
  id: string;
  email: string;
  role?: string;
  department?: string;
  name?: string;
  position?: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  position?: string;
  department?: string;
  phone?: string;
  experience?: number;
  salary?: number;
  availability?: number;
  currentTasks?: number;
  joinDate?: string;
  createdAt?: string;
  role?: string;
  skills: {
    name: string;
    level: number;
    category: string;
  }[];
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status?: string;
  priority?: string;
  estimatedHours?: number;
  progress?: number;
  due_date?: string | null; // ✅ renamed for consistency
  assigned_to?: string | null; // ✅ renamed for consistency
  createdAt?: string | null;
  completed_at?: string | null; // Added for tracking completion time
  requiredSkills: {
    name: string;
    level: number;
    importance: string;
    category: string;
  }[];
}

export interface Leave {
  id: string;
  employeeId: string;
  type?: string | null;
  startDate: string;
  endDate: string;
  reason?: string | null;
  status?: string;
  createdAt?: string | null;
}

export interface Attendance {
  id: string;
  employeeId: string;
  date: string;
  status: 'present' | 'absent' | 'leave' | 'late' | 'half-day' | 'on-break';
  checkIn?: string | null;
  checkOut?: string | null;
  breakStart?: string | null;
  breakEnd?: string | null;
  breakDuration?: number; // minutes
  totalHours?: number;
  isLate?: boolean;
  isOvertime?: boolean;
  overtimeHours?: number;
  breakDeduction?: number;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface AttendanceLog {
  id: string;
  attendanceId: string;
  employeeId: string;
  eventType: 'check-in' | 'check-out' | 'break-start' | 'break-end';
  eventTime: string;
  location?: string | null;
  ipAddress?: string | null;
  deviceInfo?: string | null;
  createdAt?: string | null;
}

export interface PunchInResponse {
  success: boolean;
  attendance: Attendance;
  message: string;
}

export interface PunchOutResponse {
  success: boolean;
  attendance: Attendance;
  message: string;
  totalHours: number;
  isOvertime: boolean;
  overtimeHours: number;
}

export interface Report {
  id: string;
  title: string;
  type: string;
  generatedAt: string;
  data: any; // JSON column in supabase
}

// ---------------- API SERVICE ----------------
export const apiService = {
  // ---------------- UTIL / DEBUG (no-op in Supabase mode) ----------------
  async testServer() {
    return { message: 'ok' };
  },

  async forceInitialize() {
    return { users: [] };
  },
  // ---------------- AUTH ----------------
  async signup(email: string, password: string, metadata?: Record<string, any>) {
    const hashedPassword = await hashPassword(password);

    try {
      // Try to create Supabase Auth user (for backward compatibility)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata },
      });

      if (error) {
        console.warn('Supabase Auth signup failed, falling back to database-only auth:', error);
        // Fallback: Create employee with password only (no Supabase Auth)
        const employeePayload: any = {
          name: metadata?.name ?? email.split('@')[0],
          email,
          password: hashedPassword,
          role: metadata?.role ?? 'employee',
          position: metadata?.position ?? null,
          department: metadata?.department ?? null,
          phone: metadata?.phone ?? null,
          availability: 100,
        };

        const { data: empData, error: empError } = await supabase
          .from('employees')
          .insert([employeePayload])
          .select()
          .single();

        if (empError) throw empError;

        const user: User = {
          id: empData.id,
          email: empData.email,
          name: empData.name,
          role: empData.role,
          position: empData.position,
          department: empData.department,
        };

        return { user };
      }

      // Supabase Auth succeeded - also create/update employees record with password
      if (data.user) {
        const { user } = formatUser(data.user);
        await this.ensureEmployeeExistsForAuth(user, metadata, hashedPassword);
        return { user };
      }

      throw new Error("Signup failed: user not returned");
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  },

  async login(email: string, password: string) {

    // First, try Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error && data.user) {
      // Supabase Auth succeeded
      const { user } = formatUser(data.user);
      await this.ensureEmployeeExistsForAuth(user, (data.user as any).user_metadata ?? {});
      saveSession(user);
      return { user };
    }

    // Supabase Auth failed - try database password verification
    const { data: empDataArray, error: empError } = await supabase
      .from('employees')
      .select('*')
      .eq('email', email);

    if (empError) {
      throw new Error('Database error: ' + empError.message);
    }

    if (!empDataArray || empDataArray.length === 0) {
      throw new Error('User not found in database');
    }

    // Get first matching user
    const empData = empDataArray[0];

    // Verify password against hash in database
    if (!empData.password) {
      throw new Error('No password set for this account. Please use Supabase Auth or contact admin.');
    }

    // Verify password against hash in database
    const isPasswordValid = await verifyPassword(password, empData.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Password verified! Create user object
    const user: User = {
      id: empData.id,
      email: empData.email,
      name: empData.name,
      role: empData.role,
      position: empData.position,
      department: empData.department,
      needsPasswordChange: empData.needs_password_change || false,
    };

    // Establish a Supabase Auth session so RLS-protected writes (tasks, employees) work
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        // No Supabase Auth account yet — create one then sign in
        await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: empData.role,
              name: empData.name,
              department: empData.department,
              position: empData.position,
            },
          },
        });
        // Sign in immediately (works when email confirmation is disabled)
        await supabase.auth.signInWithPassword({ email, password });
      }
    } catch {
      // DB auth succeeded — continue even if Supabase Auth setup fails
      console.warn('Could not establish Supabase Auth session; some writes may fail RLS.');
    }

    saveSession(user);
    return { user };
  },

  async logout() {
    // Clear both Supabase Auth and custom session
    const { error } = await supabase.auth.signOut();
    
    // Import and clear session
    const { clearSession } = await import('./sessionUtils');
    clearSession();
    
    // Don't throw error if signOut fails (user might be using db-only auth)
    if (error) {
      console.warn('Supabase Auth signOut failed (might be db-only user):', error);
    }
    
    return true;
  },

  async getCurrentUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!data.user) return null;
    return formatUser(data.user).user;
  },

  // ---------------- EMPLOYEES ----------------
  async ensureEmployeeExistsForAuth(user: User, metadata?: Record<string, any>, password?: string) {
    // Create or update an employees row keyed by auth user id
    const payload: any = {
      id: user.id,
      name: user.name ?? metadata?.name ?? user.email?.split('@')[0] ?? 'User',
      email: user.email,
      role: user.role ?? metadata?.role ?? 'employee',
      position: user.position ?? metadata?.position ?? null,
      department: user.department ?? metadata?.department ?? null,
      availability: 100,
    };
    
    // Add password if provided (for hybrid auth)
    if (password) {
      payload.password = password;
    }
    
    const { error } = await supabase
      .from('employees')
      .upsert([payload], { onConflict: 'id' });
    if (error) throw error;
    return true;
  },
  async getEmployees(): Promise<Employee[]> {
    const { data, error } = await supabase
      .from("employees")
      .select("*, employee_skills(level, skills(id, name, category))");

    if (error) throw error;

    return (data ?? []).map((e: any) => {
      const skills = (e.employee_skills ?? [])
        .filter((row: any) => row && row.skills)
        .map((row: any) => ({
          name: row.skills.name,
          level: row.level,
          category: row.skills.category,
        }));

      return {
        id: e.id,
        name: e.name,
        email: e.email,
        position: e.position || undefined,
        department: e.department || undefined,
        phone: e.phone || undefined,
        experience: e.experience || 0,
        salary: e.salary || 0,
        availability: e.availability || 100,
        currentTasks: e.currenttasks || 0,
        joinDate: e.joindate || '',
        createdAt: e.created_at || undefined,
        role: e.role || 'employee',
        skills,
      } as Employee;
    });
  },

  async deleteEmployee(employeeId: string): Promise<boolean> {
    const { error } = await supabase
      .from("employees")
      .delete()
      .eq("id", employeeId);
    if (error) throw error;
    return true;
  },

  async addEmployee(employee: Partial<Employee>): Promise<Employee> {
    // Generate temporary password for new employee
    const tempPassword = generateTempPassword();
    const hashedPassword = await hashPassword(tempPassword);

    const normalize = (v: any) => (v === undefined || v === "" ? null : v);
    const payload: any = {
      name: (employee.name ?? "").trim(),
      email: (employee.email ?? "").trim(),
      position: normalize(employee.position),
      department: normalize(employee.department),
      phone: normalize(employee.phone),
      experience: employee.experience ?? 0,
      salary: employee.salary ?? 0,
      availability: employee.availability ?? 100,
      // Use lowercase column names because Postgres folds unquoted identifiers
      currenttasks: employee.currentTasks ?? 0,
      joindate:
        employee.joinDate && employee.joinDate !== ""
          ? employee.joinDate
          : new Date().toISOString().slice(0, 10),
      role: (employee as any).role ?? 'employee',
      password: hashedPassword,
      needs_password_change: true,
    };

    const { data, error } = await supabase
      .from("employees")
      .insert([payload])
      .select()
      .single();

    if (error) throw error;

    // Try to send welcome email (will fail in browser due to CORS, that's OK for demo)
    const emailSent = await sendWelcomeEmail(
      payload.email,
      payload.name,
      tempPassword
    ).catch(err => {
      console.warn('Email sending failed (expected in browser due to CORS):', err.message);
      return false;
    });

    // If email failed, we'll show the password in the UI (good for demo!)
    if (!emailSent) {
      console.log('📧 Demo Mode: Temp password for', payload.email, ':', tempPassword);
    }

    // Add skills if provided
    if (employee.skills && employee.skills.length > 0) {
      for (const skill of employee.skills) {
        // First, get or create the skill
        let { data: skillData, error: skillError } = await supabase
          .from("skills")
          .select("id")
          .eq("name", skill.name)
          .single();

        if (skillError && skillError.code === 'PGRST116') {
          // Skill doesn't exist, create it
          const { data: newSkill, error: createError } = await supabase
            .from("skills")
            .insert([
              {
                name: skill.name,
                category: skill.category,
              },
            ])
            .select()
            .single();
          
          if (createError) throw createError;
          skillData = newSkill;
        } else if (skillError) {
          throw skillError;
        }

        // Add employee skill relationship
        const { error: empSkillError } = await supabase
          .from("employee_skills")
          .insert([{
            employee_id: data.id,
            skill_id: skillData!.id,
            level: skill.level
          }]);

        if (empSkillError) throw empSkillError;
      }
    }

    // Log temp password to console for demo (email won't work from browser)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ EMPLOYEE ADDED SUCCESSFULLY');
    console.log('📧 Email:', payload.email);
    console.log('🔑 Temporary Password:', tempPassword);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('NOTE: Email sending blocked by browser CORS policy');
    console.log('For demo: Copy password from console ☝️');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return {
      id: data.id,
      name: data.name,
      email: data.email,
      position: data.position || undefined,
      department: data.department || undefined,
      phone: data.phone || undefined,
      experience: data.experience || 0,
      salary: data.salary || 0,
      availability: data.availability || 100,
      currentTasks: data.currentTasks ?? data.currenttasks ?? 0,
      joinDate: data.joinDate ?? data.joindate ?? '',
      createdAt: data.created_at || undefined,
      skills: employee.skills || [],
    } as Employee;
  },

  // ---------------- TASKS ----------------
  async getTasks(): Promise<Task[]> {
    const { data, error } = await supabase
      .from("tasks")
      .select("*, task_required_skills(level, importance, skills(id, name, category))")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data ?? []).map((t: any) => {
      const requiredSkills = (t.task_required_skills ?? [])
        .filter((row: any) => row && row.skills)
        .map((row: any) => ({
          name: row.skills.name,
          level: row.level,
          importance: row.importance,
          category: row.skills.category,
        }));

      return {
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        estimatedHours: t.estimatedhours ?? 0,
        progress: t.progress ?? 0,
        due_date: t.due_date,
        assigned_to: t.assigned_to,
        createdAt: t.created_at,
        requiredSkills,
      } as Task;
    });
  },

  async addTask(task: Partial<Task>): Promise<Task> {
    const normalize = (v: any) => (v === undefined || v === "" ? null : v);
    const payload: any = {
      title: (task.title ?? "").trim(),
      description: normalize(task.description),
      status: task.status ?? "pending",
      priority: task.priority ?? "medium",
      estimatedhours: task.estimatedHours ?? 0,
      progress: task.progress ?? 0,
      due_date: normalize(task.due_date),
      assigned_to: normalize(task.assigned_to),
    };

    const { data, error } = await supabase
      .from("tasks")
      .insert([payload])
      .select()
      .single();

    if (error) throw error;

    // Add required skills if provided
    if (task.requiredSkills && task.requiredSkills.length > 0) {
      for (const skill of task.requiredSkills) {
        // First, get or create the skill
        let { data: skillData, error: skillError } = await supabase
          .from("skills")
          .select("id")
          .eq("name", skill.name)
          .single();

        if (skillError && skillError.code === 'PGRST116') {
          // Skill doesn't exist, create it
          const { data: newSkill, error: createError } = await supabase
            .from("skills")
            .insert([
              {
                name: skill.name,
                category: skill.category,
              },
            ])
            .select()
            .single();
          
          if (createError) throw createError;
          skillData = newSkill;
        } else if (skillError) {
          throw skillError;
        }

        // Add task required skill relationship
        const { error: taskSkillError } = await supabase
          .from("task_required_skills")
          .insert([{
            task_id: data.id,
            skill_id: skillData!.id,
            level: skill.level,
            importance: skill.importance
          }]);

        if (taskSkillError) throw taskSkillError;
      }
    }

    return {
      id: data.id,
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      estimatedHours: data.estimatedhours || 0,
      progress: data.progress || 0,
      due_date: data.due_date,
      assigned_to: data.assigned_to,
      createdAt: data.created_at,
      requiredSkills: task.requiredSkills || [],
    } as Task;
  },

  async assignTask(taskId: string, employeeId: string): Promise<Task> {
    const { data, error } = await supabase
      .from("tasks")
      .update({ assigned_to: employeeId, status: "assigned" })
      .eq("id", taskId)
      .select()
      .single();

    if (error) throw error;

    return {
      ...data,
      due_date: data.due_date,
      assigned_to: data.assigned_to,
      requiredSkills: [],
    } as Task;
  },

  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
    const dbUpdates: any = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
    if (updates.estimatedHours !== undefined) dbUpdates.estimatedhours = updates.estimatedHours;
    if (updates.progress !== undefined) dbUpdates.progress = updates.progress;
    if (updates.due_date !== undefined) dbUpdates.due_date = updates.due_date;
    if (updates.assigned_to !== undefined) dbUpdates.assigned_to = updates.assigned_to;

    const { data, error } = await supabase
      .from('tasks')
      .update(dbUpdates)
      .eq('id', taskId)
      .select()
      .single();
    if (error) throw error;
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      estimatedHours: data.estimatedhours ?? 0,
      progress: data.progress ?? 0,
      due_date: data.due_date,
      assigned_to: data.assigned_to,
      createdAt: data.created_at,
      requiredSkills: [],
    } as Task;
  },

  async deleteTask(taskId: string): Promise<boolean> {
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId);
    if (error) throw error;
    return true;
  },

  // ---------------- LEAVE REQUESTS ----------------
  async getLeaves(): Promise<Leave[]> {
    const { data, error } = await supabase
      .from("leave_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapLeaveRow);
  },

  async requestLeave(leave: Partial<Leave>): Promise<Leave> {
    const payload: any = {
      employee_id: leave.employeeId,
      type: leave.type ?? null,
      start_date: leave.startDate,
      end_date: leave.endDate,
      reason: leave.reason ?? null,
      status: leave.status ?? "pending",
    };

    const { data, error } = await supabase
      .from("leave_requests")
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return mapLeaveRow(data);
  },

  async approveLeave(leaveId: string) {
    const { data, error } = await supabase
      .from("leave_requests")
      .update({ status: "approved" })
      .eq("id", leaveId)
      .select()
      .single();
    if (error) throw error;
    return mapLeaveRow(data);
  },

  async rejectLeave(leaveId: string) {
    const { data, error } = await supabase
      .from("leave_requests")
      .update({ status: "rejected" })
      .eq("id", leaveId)
      .select()
      .single();
    if (error) throw error;
    return mapLeaveRow(data);
  },

  // ---------------- ATTENDANCE ----------------
  async getAttendance(): Promise<Attendance[]> {
    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .order("date", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapAttendanceRow);
  },

  // Get today's attendance for an employee
  async getTodayAttendance(employeeId: string): Promise<Attendance | null> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("date", today)
      .single();
    
    if (error || !data) return null;
    return mapAttendanceRow(data);
  },

  // Punch In
  async punchIn(employeeId: string, location?: string): Promise<PunchInResponse> {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    
    try {
      // Check if already punched in today
      const existing = await this.getTodayAttendance(employeeId);
      
      if (existing && existing.checkIn) {
        return {
          success: false,
          attendance: existing,
          message: 'You have already punched in today'
        };
      }

      // Flexible shift: No fixed start time, no late marking
      // Employee can punch in anytime
      let attendance: Attendance;

      if (existing) {
        // Update existing record
        const { data, error } = await supabase
          .from("attendance")
          .update({
            check_in: now,
            status: 'present',
            is_late: false,
            updated_at: now
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        attendance = mapAttendanceRow(data);
      } else {
        // Create new record
        const { data, error } = await supabase
          .from("attendance")
          .insert({
            employee_id: employeeId,
            date: today,
            check_in: now,
            status: 'present',
            is_late: false,
            break_duration: 0,
            total_hours: 0
          })
          .select()
          .single();

        if (error) throw error;
        attendance = mapAttendanceRow(data);
      }

      // Log the event
      await supabase.from("attendance_logs").insert({
        attendance_id: attendance.id,
        employee_id: employeeId,
        event_type: 'check-in',
        event_time: now,
        location: location || null
      });

      return {
        success: true,
        attendance,
        message: 'Punched in successfully - Timer started'
      };
    } catch (error) {
      console.error('Punch in error:', error);
      throw error;
    }
  },

  // Punch Out
  async punchOut(employeeId: string, location?: string): Promise<PunchOutResponse> {
    const now = new Date().toISOString();
    
    try {
      const existing = await this.getTodayAttendance(employeeId);
      
      if (!existing || !existing.checkIn) {
        throw new Error('You must punch in before punching out');
      }

      if (existing.checkOut) {
        throw new Error('You have already punched out today');
      }

      // FLEXIBLE 9-HOUR SHIFT SYSTEM
      const checkInTime = new Date(existing.checkIn);
      const checkOutTime = new Date(now);
      const diffMs = checkOutTime.getTime() - checkInTime.getTime();
      const totalMinutes = Math.floor(diffMs / 1000 / 60);
      const breakMinutes = existing.breakDuration || 0;
      const workMinutes = totalMinutes - breakMinutes;
      const totalHours = Number((workMinutes / 60).toFixed(2));

      // 9-hour requirement
      const requiredHours = 9;
      const isOvertime = totalHours > requiredHours;
      const isUndertime = totalHours < requiredHours;
      
      // Calculate overtime (>9 hours)
      let overtimeHours = 0;
      if (isOvertime) {
        overtimeHours = Number((totalHours - requiredHours).toFixed(2));
      }

      // Calculate undertime deduction (<9 hours)
      let undertimeHours = 0;
      let undertimeDeduction = 0;
      if (isUndertime) {
        undertimeHours = Number((requiredHours - totalHours).toFixed(2));
        // Deduct ₹100 per hour short
        undertimeDeduction = Number((undertimeHours * 100).toFixed(2));
      }

      // Calculate break deduction (if break > 60 minutes)
      const excessBreakMinutes = Math.max(0, breakMinutes - 60);
      const breakDeduction = Number((excessBreakMinutes * 0.5).toFixed(2)); // ₹0.5 per minute

      // Total deduction
      const totalDeduction = undertimeDeduction + breakDeduction;

      // Determine final status
      let status = 'present';
      if (totalHours < 4) {
        status = 'half-day';
      } else if (isOvertime) {
        status = 'present'; // Full day with overtime
      } else if (isUndertime) {
        status = 'present'; // Present but with deduction
      }

      // Update attendance
      const { data, error } = await supabase
        .from("attendance")
        .update({
          check_out: now,
          total_hours: totalHours,
          is_overtime: isOvertime,
          overtime_hours: overtimeHours,
          break_deduction: totalDeduction, // Total deduction (undertime + break excess)
          status: status,
          is_late: false, // No late marking in flexible system
          notes: isUndertime ? `Undertime: ${undertimeHours}h (₹${undertimeDeduction} deducted)` : null,
          updated_at: now
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;
      const attendance = mapAttendanceRow(data);

      // Log the event
      await supabase.from("attendance_logs").insert({
        attendance_id: attendance.id,
        employee_id: employeeId,
        event_type: 'check-out',
        event_time: now,
        location: location || null
      });

      return {
        success: true,
        attendance,
        message: 'Punched out successfully',
        totalHours,
        isOvertime,
        overtimeHours
      };
    } catch (error) {
      console.error('Punch out error:', error);
      throw error;
    }
  },

  // Start Break
  async startBreak(employeeId: string): Promise<{ success: boolean; attendance: Attendance; message: string }> {
    const now = new Date().toISOString();
    
    try {
      const existing = await this.getTodayAttendance(employeeId);
      
      if (!existing || !existing.checkIn) {
        throw new Error('You must punch in before taking a break');
      }

      if (existing.checkOut) {
        throw new Error('You have already punched out');
      }

      // Allow multiple breaks - check if currently on break
      if (existing.status === 'on-break') {
        throw new Error('Break already in progress');
      }

      const { data, error } = await supabase
        .from("attendance")
        .update({
          break_start: now,
          status: 'on-break',
          updated_at: now
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;
      const attendance = mapAttendanceRow(data);

      // Log the event
      await supabase.from("attendance_logs").insert({
        attendance_id: attendance.id,
        employee_id: employeeId,
        event_type: 'break-start',
        event_time: now
      });

      return {
        success: true,
        attendance,
        message: 'Break started'
      };
    } catch (error) {
      console.error('Start break error:', error);
      throw error;
    }
  },

  // End Break
  async endBreak(employeeId: string): Promise<{ success: boolean; attendance: Attendance; message: string; breakDuration: number; excessMinutes: number }> {
    const now = new Date().toISOString();
    
    try {
      const existing = await this.getTodayAttendance(employeeId);
      
      if (!existing || !existing.breakStart) {
        throw new Error('You must start a break before ending it');
      }

      if (existing.breakEnd) {
        throw new Error('Break already ended');
      }

      // Calculate break duration
      const breakStartTime = new Date(existing.breakStart);
      const breakEndTime = new Date(now);
      const breakMs = breakEndTime.getTime() - breakStartTime.getTime();
      const currentBreakMinutes = Math.floor(breakMs / 1000 / 60);
      const totalBreakMinutes = (existing.breakDuration || 0) + currentBreakMinutes;
      
      const excessMinutes = Math.max(0, totalBreakMinutes - 60);

      // Restore status to present (flexible shift system)
      const status = 'present';

      // Clear break_start and break_end to allow multiple breaks
      const { data, error } = await supabase
        .from("attendance")
        .update({
          break_start: null,
          break_end: null,
          break_duration: totalBreakMinutes,
          status: status,
          updated_at: now
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;
      const attendance = mapAttendanceRow(data);

      // Log the event
      await supabase.from("attendance_logs").insert({
        attendance_id: attendance.id,
        employee_id: employeeId,
        event_type: 'break-end',
        event_time: now
      });

      return {
        success: true,
        attendance,
        message: excessMinutes > 0 
          ? `Break ended (${excessMinutes} min over limit - deduction applies)` 
          : 'Break ended',
        breakDuration: totalBreakMinutes,
        excessMinutes
      };
    } catch (error) {
      console.error('End break error:', error);
      throw error;
    }
  },

  // ---------------- DASHBOARD ----------------
  async getDashboardStats() {
    try {
      // Use the dashboard view for better performance
      const { data: kpiData, error: kpiError } = await supabase
        .from("v_dashboard_kpis")
        .select("*")
        .single();

      if (kpiError) {
        console.warn("Dashboard view not available, falling back to individual queries:", kpiError);
        
        // Fallback to individual queries
        const [employees, tasks, leaves] = await Promise.all([
          this.getEmployees().catch(() => []),
          this.getTasks().catch(() => []),
          this.getLeaves().catch(() => []),
        ]);

        const todayISO = new Date().toISOString().slice(0, 10);
        const attendanceRes = await supabase
          .from("attendance")
          .select("id")
          .eq("date", todayISO);

        const attendanceToday = attendanceRes.error ? [] : (attendanceRes.data ?? []);

        const departments = Array.from(
          new Set((employees as any[]).map((e) => e.department).filter(Boolean))
        );

        const pendingTasks = (tasks as any[]).filter((t) =>
          ["pending", "assigned", "in-progress"].includes(t.status ?? "")
        ).length;

        const completedTasks = (tasks as any[]).filter((t) => t.status === "completed").length;

        return {
          totalEmployees: employees.length,
          activeEmployees: employees.filter((e) => (e.availability ?? 0) > 0).length,
          totalTasks: tasks.length,
          pendingTasks,
          completedTasks,
          presentToday: attendanceToday.length,
          pendingLeaves: leaves.filter((l) => l.status === "pending").length,
          departments: departments.length,
        };
      }

      return {
        totalEmployees: kpiData.total_employees || 0,
        activeEmployees: kpiData.active_employees || 0,
        totalTasks: kpiData.total_tasks || 0,
        pendingTasks: kpiData.pending_tasks || 0,
        completedTasks: kpiData.completed_tasks || 0,
        presentToday: kpiData.present_today || 0,
        pendingLeaves: kpiData.pending_leaves || 0,
        departments: kpiData.departments || 0,
      };
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      return {
        totalEmployees: 0,
        activeEmployees: 0,
        totalTasks: 0,
        pendingTasks: 0,
        completedTasks: 0,
        presentToday: 0,
        pendingLeaves: 0,
        departments: 0,
      };
    }
  },

  // ---------------- REPORTS ----------------
  async getReports(): Promise<Report[]> {
    const { data, error } = await supabase.from("reports").select("*").order("generated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      id: r.id,
      title: r.title,
      type: r.type,
      generatedAt: r.generated_at,
      data: r.data,
    }));
  },

  async addReport(report: Partial<Report>): Promise<Report> {
    const payload: any = {
      title: report.title,
      type: report.type ?? "custom",
      data: report.data ?? {},
      generated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from("reports").insert([payload]).select().single();
    if (error) throw error;
    return {
      id: data.id,
      title: data.title,
      type: data.type,
      generatedAt: data.generated_at,
      data: data.data,
    };
  },

  // ---------------- SETTINGS ----------------
  async updateUserSettings(userId: string, updates: Partial<ApiUser>) {
    const { data, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();
    if (error) throw error;
    return data as ApiUser;
  },

  async updatePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    console.log('🔑 Updating password for user:', userId);

    // Get current user data
    const { data: empData, error: fetchError } = await supabase
      .from('employees')
      .select('password')
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.error('Failed to fetch user:', fetchError);
      throw new Error('Failed to fetch user data');
    }

    // Verify current password
    if (empData.password) {
      const isValid = await verifyPassword(currentPassword, empData.password);
      if (!isValid) {
        throw new Error('Current password is incorrect');
      }
    } else {
      console.warn('No password hash in DB — skipping current password verification');
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password and clear needs_password_change flag
    const { error: updateError } = await supabase
      .from('employees')
      .update({ 
        password: hashedPassword,
        needs_password_change: false,
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error('Failed to update password');
    }

    // Also update Supabase Auth password so login stays in sync
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.auth.updateUser({ password: newPassword });
      }
    } catch (e) {
      console.warn('Could not update Supabase Auth password (non-fatal):', e);
    }

    console.log('✅ Password updated successfully');
  },
};

// ---------------- HELPERS ----------------
function mapLeaveRow(row: any): Leave {
  return {
    id: row.id,
    employeeId: row.employee_id ?? row.employeeId,
    type: row.type ?? null,
    startDate: row.start_date ?? row.startDate,
    endDate: row.end_date ?? row.endDate,
    reason: row.reason ?? null,
    status: row.status ?? null,
    createdAt: row.created_at ?? null,
  };
}

function mapAttendanceRow(row: any): Attendance {
  return {
    id: row.id,
    employeeId: row.employee_id ?? row.employeeId,
    date: row.date,
    status: row.status,
    checkIn: row.check_in ?? null,
    checkOut: row.check_out ?? null,
    breakStart: row.break_start ?? null,
    breakEnd: row.break_end ?? null,
    breakDuration: row.break_duration ?? 0,
    totalHours: row.total_hours ?? 0,
    isLate: row.is_late ?? false,
    isOvertime: row.is_overtime ?? false,
    overtimeHours: row.overtime_hours ?? 0,
    breakDeduction: row.break_deduction ?? 0,
    notes: row.notes ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

function formatUser(user: any): { user: User } {
  const apiUser: User = {
    id: user.id,
    email: user.email ?? "",
    role: user.user_metadata?.role || "employee",
    department: user.user_metadata?.department,
    name: user.user_metadata?.name,
    position: user.user_metadata?.position,
  };
  return { user: apiUser };
}
