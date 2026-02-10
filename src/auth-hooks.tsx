import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { supabase } from './supabase-config'
import { apiService, User } from './api-supabase'

interface AuthContextType {
  user: User | null
  supabaseUser: SupabaseUser | null
  loading: boolean
  signUp: (email: string, password: string, userData: Partial<User>) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<User>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getDemoUserFromToken = (): User | null => {
      try {
        if (typeof window === 'undefined') return null;
        const token = localStorage.getItem('authToken');
        if (!token || !token.startsWith('demo-token-')) return null;
        const id = token.replace('demo-token-', '');
        if (id === '1') {
          return {
            id: '1',
            email: 'hr@company.com',
            name: 'HR Manager',
            position: 'HR Manager',
            role: 'manager',
            skills: [],
            department: 'Human Resources',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as User;
        }
        if (id === '2') {
          return {
            id: '2',
            email: 'employee@company.com',
            name: 'John Doe',
            position: 'Software Engineer',
            role: 'employee',
            skills: [],
            department: 'Engineering',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as User;
        }
        return null;
      } catch {
        return null;
      }
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSupabaseUser(session.user)
        loadUserProfile(session.user.id)
      } else {
        // Demo fallback: check for local demo token
        const demoUser = getDemoUserFromToken()
        if (demoUser) {
          setUser(demoUser)
          setSupabaseUser(null)
        }
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setSupabaseUser(session.user)
          await loadUserProfile(session.user.id)
        } else {
          setSupabaseUser(null)
          setUser(null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Listen for storage changes to update demo auth state across tabs or after login
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'authToken') {
        const token = e.newValue
        if (token && token.startsWith('demo-token-')) {
          // Set demo user
          const id = token.replace('demo-token-', '')
          if (id) {
            // Reuse initial logic
            const now = new Date().toISOString()
            const demo = id === '1'
              ? { id: '1', email: 'hr@company.com', name: 'HR Manager', position: 'HR Manager', role: 'manager', skills: [], department: 'Human Resources', created_at: now, updated_at: now }
              : id === '2'
              ? { id: '2', email: 'employee@company.com', name: 'John Doe', position: 'Software Engineer', role: 'employee', skills: [], department: 'Engineering', created_at: now, updated_at: now }
              : null
            if (demo) {
              setUser(demo as User)
              setSupabaseUser(null)
            }
          }
        } else {
          // Cleared token
          setUser(null)
        }
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const loadUserProfile = async (userId: string) => {
    try {
      const profile = await apiService.getCurrentUser()
      setUser(profile)
    } catch (error) {
      console.error('Error loading user profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, userData: Partial<User>) => {
    setLoading(true)
    try {
      await apiService.signUp(email, password, userData)
      // User will be set through the auth state change listener
    } catch (error) {
      setLoading(false)
      throw error
    }
  }

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    try {
      await apiService.signIn(email, password)
      // User will be set through the auth state change listener
    } catch (error) {
      setLoading(false)
      throw error
    }
  }

  const signOut = async () => {
    setLoading(true)
    try {
      await apiService.signOut()
      // Clear demo token if present
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken')
      }
      // User will be cleared through the auth state change listener
    } catch (error) {
      setLoading(false)
      throw error
    }
  }

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) throw new Error('No user logged in')
    
    try {
      const updatedUser = await apiService.updateUser(user.id, updates)
      setUser(updatedUser)
    } catch (error) {
      throw error
    }
  }

  const value = {
    user,
    supabaseUser,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Hook for protecting routes
export function useRequireAuth() {
  const { user, loading } = useAuth()
  
  useEffect(() => {
    if (!loading && !user) {
      // Redirect to login or show login modal
      console.log('User not authenticated')
    }
  }, [user, loading])

  return { user, loading }
}