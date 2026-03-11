import React, { useState, useEffect, useMemo } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
} from './components/ui/sidebar';
import { Button } from './components/ui/button';
import { Avatar, AvatarFallback } from './components/ui/avatar';
import { Badge } from './components/ui/badge';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Clock,
  Calendar,
  BarChart3,
  Settings as SettingsIcon,
  User as UserIcon,
  LogOut,
  Bell,
  Shield,
} from 'lucide-react';

import { Dashboard } from './components/Dashboard';
import { EmployeeManagement } from './components/EmployeeManagement';
import { TaskManagement } from './components/TaskManagement';
import { AttendanceManagement } from './components/AttendanceManagement';
import { LeaveManagement } from './components/LeaveManagement';
import Settings from './components/Settings';
import { Reports } from './components/Reports';
import { AccountSettings } from './components/AccountSettings';
import { Login } from './components/Login';
import { SignUp } from './components/SignUp';
import { EmployeeView } from './components/EmployeeView';
import { ThemeToggle } from './components/ThemeToggle';
import { ThemeProvider } from './contexts/ThemeContext';
import { User, AuthState, UserRole } from './types/auth';
import { apiService } from './utils/api';
import { Alert, AlertDescription } from './components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import {
  hasSidebarAccess,
  canManageEmployees,
  canManageTasks,
  canApproveLeaves,
  canViewReports,
  canManageSettings,
  getRoleLabel,
  getRoleBadgeVariant,
} from './utils/permissions';

type Page =
  | 'dashboard'
  | 'employees'
  | 'tasks'
  | 'attendance'
  | 'leave'
  | 'reports'
  | 'account'
  | 'settings';

type AuthView = 'login' | 'signup';

export default function App() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
  });
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [isMockMode, setIsMockMode] = useState(false);
  const [authView, setAuthView] = useState<AuthView>('login');
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  // Track refresh triggers
  const [refreshEmployees, setRefreshEmployees] = useState(0);
  const [refreshTasks, setRefreshTasks] = useState(0);

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        // Try to restore from localStorage first (demo mode)
        const storedUser = localStorage.getItem('hrms_user');
        const storedRole = localStorage.getItem('hrms_user_role');
        
        if (storedUser) {
          const user = JSON.parse(storedUser);
          setAuthState({ isAuthenticated: true, user });
          setIsLoadingSession(false);
          return;
        }

        // Try Supabase session if available
        try {
          const { supabase } = await import('./supabase-config');
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
            // Convert Supabase user to our User type
            const { apiService } = await import('./utils/api');
            const profile = await apiService.getCurrentUser();
            
            if (profile) {
              setAuthState({ isAuthenticated: true, user: profile });
            }
          }
        } catch (supabaseError) {
          // Supabase not configured, continue with demo mode
          console.log('Supabase not configured, using demo mode');
        }
      } catch (error) {
        console.error('Failed to restore session:', error);
      } finally {
        setIsLoadingSession(false);
      }
    };

    restoreSession();
  }, []);

  const getInitials = (name?: string) => {
    if (!name || typeof name !== 'string') return '?';
    return name
      .trim()
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const handleLogin = (user: User) => {
    setAuthState({ isAuthenticated: true, user });
    setIsMockMode(false); // Always false for now
    setAuthView('login');
    try {
      localStorage.setItem('hrms_user', JSON.stringify(user));
      localStorage.setItem('hrms_user_role', user.role ?? 'employee');
    } catch { }
  };

  const handleSignUp = (user: User) => {
    setAuthState({ isAuthenticated: true, user });
    setIsMockMode(false); // Always false for now
    setAuthView('login');
    try {
      localStorage.setItem('hrms_user', JSON.stringify(user));
      localStorage.setItem('hrms_user_role', user.role ?? 'employee');
    } catch { }
  };

  const handleLogout = () => {
    apiService.logout();
    setAuthState({ isAuthenticated: false, user: null });
    setAuthView('login');
    try {
      localStorage.removeItem('hrms_user');
      localStorage.removeItem('hrms_user_role');
    } catch { }
  };

  // Show loading state while checking session
  if (isLoadingSession) {
    return (
      <ThemeProvider>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  // ✅ Show login/signup if not authenticated
  if (!authState.isAuthenticated) {
    return (
      <ThemeProvider>
        {authView === 'signup' ? (
          <SignUp
            onSignUp={handleSignUp}
            onBackToLogin={() => setAuthView('login')}
          />
        ) : (
          <Login
            onLogin={handleLogin}
            onShowSignUp={() => setAuthView('signup')}
          />
        )}
      </ThemeProvider>
    );
  }

  // ✅ Employee view — limited dashboard, no sidebar
  if (authState.user?.role === 'employee') {
    return (
      <ThemeProvider>
        <EmployeeView user={authState.user} onLogout={handleLogout} />
      </ThemeProvider>
    );
  }

  // ✅ Role-based sidebar — filter items by permission
  const userRole = authState.user?.role as UserRole;

  const allMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, show: true },
    { id: 'employees', label: 'Employees', icon: Users, show: true },
    { id: 'tasks', label: 'Tasks', icon: Briefcase, show: true },
    { id: 'attendance', label: 'Attendance', icon: Clock, show: true },
    { id: 'leave', label: 'Leave', icon: Calendar, show: canApproveLeaves(userRole) || userRole === 'manager' },
    { id: 'reports', label: 'Reports', icon: BarChart3, show: canViewReports(userRole) },
    { id: 'account', label: 'Account', icon: UserIcon, show: true },
    { id: 'settings', label: 'Settings', icon: SettingsIcon, show: canManageSettings(userRole) },
  ];

  const menuItems = allMenuItems.filter(item => item.show);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <Dashboard
            refreshEmployees={refreshEmployees}
            refreshTasks={refreshTasks}
            currentUser={authState.user}
          />
        );
      case 'employees':
        return (
          <EmployeeManagement
            refreshKey={refreshEmployees}
            onEmployeeAdded={() => setRefreshEmployees((k) => k + 1)}
            userRole={userRole}
          />
        );
      case 'tasks':
        return (
          <TaskManagement
            refreshKey={refreshTasks}
            onTaskCreated={() => setRefreshTasks((k) => k + 1)}
            userRole={userRole}
            currentUser={authState.user}
          />
        );
      case 'attendance':
        return <AttendanceManagement currentUser={authState.user} />;
      case 'leave':
        return <LeaveManagement userRole={userRole} userName={authState.user?.name} userId={authState.user?.id} />;
      case 'reports':
        return <Reports />;
      case 'account':
        return <AccountSettings user={authState.user!} />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <SidebarProvider>
          <div className="min-h-screen flex w-full">
            {/* Sidebar */}
            <Sidebar>
              <SidebarHeader className="border-b p-6">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="font-semibold">SmartHRMS</h2>
                    <p className="text-xs text-muted-foreground">
                      HR Management Portal
                    </p>
                  </div>
                </div>
              </SidebarHeader>

              <SidebarContent className="p-4">
                <nav className="space-y-1">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPage === item.id;
                    return (
                      <Button
                        key={item.id}
                        variant={isActive ? 'secondary' : 'ghost'}
                        className="w-full justify-start"
                        onClick={() => setCurrentPage(item.id as Page)}
                      >
                        <Icon className="h-4 w-4 mr-3" />
                        {item.label}
                      </Button>
                    );
                  })}
                </nav>

                {/* User info + role badge */}
                <div className="mt-auto pt-4 border-t">
                  <div className="flex items-center space-x-3 p-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {authState.user?.name
                          ?.split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{authState.user?.name}</p>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${getRoleBadgeVariant(userRole)}`}>
                          {getRoleLabel(userRole)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {userRole?.toUpperCase()}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleLogout}>
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </SidebarContent>
            </Sidebar>

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0">
              <header className="border-b bg-background">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center space-x-4">
                    <SidebarTrigger />
                    <div className="hidden sm:block">
                      <h1 className="font-semibold capitalize">
                        {currentPage}
                      </h1>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${getRoleBadgeVariant(userRole)}`}>
                      <Shield className="h-3 w-3" />
                      {getRoleLabel(userRole)}
                    </span>
                    <Badge variant="outline">
                      {authState.user?.department}
                    </Badge>
                    <ThemeToggle />
                    <Button variant="ghost" size="sm">
                      <Bell className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </header>

              <main className="flex-1 overflow-auto">
                {isMockMode && (
                  <Alert className="m-4 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
                    <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    <AlertDescription className="text-orange-800 dark:text-orange-300">
                      <strong>Demo Mode:</strong> Backend unavailable, using mock
                      data. All changes are temporary.
                    </AlertDescription>
                  </Alert>
                )}
                {renderPage()}
              </main>
            </div>
          </div>
        </SidebarProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

// ✅ Placeholders
function ReportsPlaceholder() {
  return (
    <div className="p-6 text-center">
      <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
      <h3 className="font-medium mb-2">Reports & Analytics</h3>
      <p className="text-muted-foreground">
        Advanced reporting and analytics features will be available here.
      </p>
    </div>
  );
}

function SettingsPlaceholder() {
  return (
    <div className="p-6 text-center">
      <SettingsIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
      <h3 className="font-medium mb-2">System Settings</h3>
      <p className="text-muted-foreground">
        System configuration and settings will be available here.
      </p>
    </div>
  );
}
