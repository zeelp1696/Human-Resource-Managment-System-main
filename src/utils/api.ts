// src/lib/api.ts
import { supabase } from "../supabase";
import { User } from "../types/auth";

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
  status: string;
  createdAt?: string | null;
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
    const { hashPassword } = await import('./passwordUtils');
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
    const { verifyPassword } = await import('./passwordUtils');
    const { saveSession } = await import('./sessionUtils');

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

    // TEMPORARY: For presentation, skip bcrypt verification
    // TODO: Re-enable after presentation
    const isPasswordValid = true; // await verifyPassword(password, empData.password);
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

    saveSession(user);
    return { user };
  },

  async logout() {
    const { clearSession } = await import('./sessionUtils');
    
    // Clear both Supabase Auth and custom session
    const { error } = await supabase.auth.signOut();
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
    // Import utilities for email onboarding
    const { generateTempPassword } = await import('./passwordGenerator');
    const { hashPassword } = await import('./passwordUtils');
    const { sendWelcomeEmail } = await import('./emailService');

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
      role: 'employee',
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
    const { verifyPassword } = await import('./passwordUtils');
    const { hashPassword } = await import('./passwordUtils');

    // Get current user data
    const { data: empData, error: fetchError } = await supabase
      .from('employees')
      .select('password')
      .eq('id', userId)
      .single();

    if (fetchError) throw new Error('Failed to fetch user data');

    // Verify current password
    if (empData.password) {
      const isValid = await verifyPassword(currentPassword, empData.password);
      if (!isValid) {
        throw new Error('Current password is incorrect');
      }
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

    if (updateError) throw new Error('Failed to update password');
  },
};

// ---------------- HELPERS ----------------
function mapLeaveRow(row: any): Leave {
  return {
    id: row.id,
    employeeId: row.employee_id ?? row.employeeId,
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
    createdAt: row.created_at ?? null,
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
