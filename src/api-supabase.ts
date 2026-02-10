import { supabase } from './supabase-config'
import type { Database } from './supabase-config'

type User = Database['public']['Tables']['users']['Row']
type Task = Database['public']['Tables']['tasks']['Row']
type LeaveRequest = Database['public']['Tables']['leave_requests']['Row']
type Attendance = Database['public']['Tables']['attendance']['Row']

export const apiService = {
  // Authentication
  async signUp(email: string, password: string, userData: Partial<User>) {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) throw authError

    if (authData.user) {
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email,
          ...userData,
        })

      if (profileError) throw profileError
    }

    return authData
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    return data
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return null

    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) throw error
    return profile
  },

  // User Management
  async getUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async createUser(userData: Database['public']['Tables']['users']['Insert']) {
    const { data, error } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateUser(id: string, updates: Database['public']['Tables']['users']['Update']) {
    const { data, error } = await supabase
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteUser(id: string) {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // Task Management
  async getTasks() {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assigned_user:users!tasks_assigned_to_fkey(name, email),
        created_by_user:users!tasks_created_by_fkey(name, email)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async getTasksForUser(userId: string) {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assigned_user:users!tasks_assigned_to_fkey(name, email),
        created_by_user:users!tasks_created_by_fkey(name, email)
      `)
      .eq('assigned_to', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async createTask(taskData: Database['public']['Tables']['tasks']['Insert']) {
    const { data, error } = await supabase
      .from('tasks')
      .insert(taskData)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateTask(id: string, updates: Database['public']['Tables']['tasks']['Update']) {
    const { data, error } = await supabase
      .from('tasks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteTask(id: string) {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // Skill-based task assignment
  async findBestEmployeeForTask(requiredSkills: string[]) {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'employee')

    if (error) throw error

    // Find users with matching skills
    const scoredUsers = users.map(user => {
      const matchingSkills = user.skills.filter((skill: any) => 
        requiredSkills.includes(skill)
      )
      return {
        ...user,
        skillMatch: matchingSkills.length,
        skillMatchPercentage: (matchingSkills.length / requiredSkills.length) * 100
      }
    })

    // Sort by skill match percentage
    return scoredUsers.sort((a, b) => b.skillMatchPercentage - a.skillMatchPercentage)
  },

  // Leave Management
  async getLeaveRequests() {
    const { data, error } = await supabase
      .from('leave_requests')
      .select(`
        *,
        user:users(name, email, department),
        approver:users!leave_requests_approved_by_fkey(name, email)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async createLeaveRequest(leaveData: Database['public']['Tables']['leave_requests']['Insert']) {
    const { data, error } = await supabase
      .from('leave_requests')
      .insert(leaveData)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateLeaveRequest(id: string, updates: Database['public']['Tables']['leave_requests']['Update']) {
    const { data, error } = await supabase
      .from('leave_requests')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Attendance Management
  async getAttendance(userId?: string, date?: string) {
    let query = supabase
      .from('attendance')
      .select(`
        *,
        user:users(name, email, department)
      `)

    if (userId) {
      query = query.eq('user_id', userId)
    }

    if (date) {
      query = query.eq('date', date)
    }

    const { data, error } = await query.order('date', { ascending: false })

    if (error) throw error
    return data
  },

  async checkIn(userId: string) {
    const today = new Date().toISOString().split('T')[0]
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('attendance')
      .insert({
        user_id: userId,
        date: today,
        check_in: now,
        status: 'present'
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async checkOut(userId: string) {
    const today = new Date().toISOString().split('T')[0]
    const now = new Date().toISOString()

    // Find today's attendance record
    const { data: attendance, error: fetchError } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single()

    if (fetchError) throw fetchError

    // Calculate total hours
    const checkInTime = new Date(attendance.check_in)
    const checkOutTime = new Date(now)
    const totalHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)

    const { data, error } = await supabase
      .from('attendance')
      .update({
        check_out: now,
        total_hours: Math.round(totalHours * 100) / 100,
        updated_at: now
      })
      .eq('id', attendance.id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Dashboard Analytics
  async getDashboardStats() {
    // Get user counts by role
    const { data: userStats, error: userError } = await supabase
      .from('users')
      .select('role')

    if (userError) throw userError

    // Get task stats
    const { data: taskStats, error: taskError } = await supabase
      .from('tasks')
      .select('status')

    if (taskError) throw taskError

    // Get leave stats
    const { data: leaveStats, error: leaveError } = await supabase
      .from('leave_requests')
      .select('status')

    if (leaveError) throw leaveError

    return {
      users: {
        total: userStats.length,
        admin: userStats.filter(u => u.role === 'admin').length,
        manager: userStats.filter(u => u.role === 'manager').length,
        employee: userStats.filter(u => u.role === 'employee').length,
      },
      tasks: {
        total: taskStats.length,
        pending: taskStats.filter(t => t.status === 'pending').length,
        inProgress: taskStats.filter(t => t.status === 'in_progress').length,
        completed: taskStats.filter(t => t.status === 'completed').length,
        cancelled: taskStats.filter(t => t.status === 'cancelled').length,
      },
      leaves: {
        total: leaveStats.length,
        pending: leaveStats.filter(l => l.status === 'pending').length,
        approved: leaveStats.filter(l => l.status === 'approved').length,
        rejected: leaveStats.filter(l => l.status === 'rejected').length,
      }
    }
  }
}

export type { User, Task, LeaveRequest, Attendance }