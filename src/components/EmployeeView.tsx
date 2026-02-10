import React, { useEffect, useState } from 'react';
import { Sidebar, SidebarContent, SidebarHeader, SidebarProvider, SidebarTrigger } from './ui/sidebar';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { 
  LayoutDashboard, 
  Briefcase, 
  Clock, 
  Calendar, 
  User,
  FileText,
  Award,
  Settings,
  LogOut,
  Bell
} from 'lucide-react';
import { EmployeeDashboard } from './EmployeeDashboard';
import { AccountSettings } from './AccountSettings';
import { ThemeToggle } from './ThemeToggle';
import { User as AuthUser } from '../types/auth';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { apiService } from '../utils/api';
import type { Task, Attendance, Leave, Employee } from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { supabase } from '../supabase';

type EmployeePage = 'dashboard' | 'tasks' | 'profile' | 'attendance' | 'leaves' | 'account' | 'documents';

interface EmployeeViewProps {
  user: AuthUser;
  onLogout: () => void;
}

export function EmployeeView({ user, onLogout }: EmployeeViewProps) {
  const [currentPage, setCurrentPage] = useState<EmployeePage>('dashboard');
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  useEffect(() => {
    const load = async () => {
      try {
        const employees = await apiService.getEmployees();
        const match = (employees ?? []).find(e => (e.email ?? '').toLowerCase() === (user.email ?? '').toLowerCase());
        setEmployeeId(match?.id ?? null);
      } catch (e) {
        console.error('Failed to resolve employee id for user', e);
        setEmployeeId(null);
      }
    };
    load();
  }, [user.email]);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tasks', label: 'My Tasks', icon: Briefcase },
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'leaves', label: 'Leave Requests', icon: Calendar },
    { id: 'account', label: 'Account Settings', icon: Settings },
    { id: 'documents', label: 'Documents', icon: FileText },
  ];

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <EmployeeDashboard user={user} />;
      case 'tasks':
        return <MyTasks user={user} employeeId={employeeId} />;
      case 'profile':
        return <MyProfile user={user} />;
      case 'attendance':
        return <MyAttendance user={user} employeeId={employeeId} />;
      case 'leaves':
        return <MyLeaves user={user} employeeId={employeeId} />;
      case 'account':
        return <AccountSettings user={user} />;
      case 'documents':
        return <DocumentsPlaceholder />;
      default:
        return <EmployeeDashboard user={user} />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar>
          <SidebarHeader className="border-b p-6">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                <User className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="font-semibold">SmartHRMS</h2>
                <p className="text-xs text-muted-foreground">Employee Portal</p>
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
                    variant={isActive ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setCurrentPage(item.id as EmployeePage)}
                  >
                    <Icon className="h-4 w-4 mr-3" />
                    {item.label}
                  </Button>
                );
              })}
            </nav>

            <div className="mt-auto pt-4 border-t">
              <div className="flex items-center space-x-3 p-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {user?.name ? user.name.split(' ').map(n => n[0]).join('') : "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.position}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={onLogout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="border-b bg-background">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center space-x-4">
                <SidebarTrigger />
                <div className="hidden sm:block">
                  <h1 className="font-semibold capitalize">
                    {currentPage === 'dashboard' ? 'Dashboard' : 
                     currentPage === 'tasks' ? 'My Tasks' :
                     currentPage === 'profile' ? 'My Profile' :
                     currentPage === 'attendance' ? 'My Attendance' :
                     currentPage === 'leaves' ? 'Leave Requests' :
                     currentPage === 'account' ? 'Account Settings' :
                     'Documents'}
                  </h1>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <Badge variant="outline">{user.department}</Badge>
                <ThemeToggle />
                <Button variant="ghost" size="sm">
                  <Bell className="h-4 w-4" />
                </Button>
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {user?.name ? user.name.split(' ').map(n => n[0]).join('') : "?"}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            {renderPage()}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

// Employee-specific pages
function MyTasks({ user, employeeId }: { user: AuthUser; employeeId: string | null }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const all = await apiService.getTasks();
        const id = employeeId ?? user.id;
        setTasks((all ?? []).filter(t => (t.assigned_to ?? '') === id));
      } finally {
        setIsLoading(false);
      }
    };
    load();
    if (!employeeId) return;
    const channel = supabase
      .channel(`rt-tasks-${employeeId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, async () => {
        const all = await apiService.getTasks();
        const id = employeeId ?? user.id;
        setTasks((all ?? []).filter(t => (t.assigned_to ?? '') === id));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id, employeeId]);

  const updateStatus = async (taskId: string, status: string) => {
    const updated = await apiService.updateTask(taskId, { status });
    setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
  };

  return (
    <div className="p-6 space-y-4">
      <h3 className="text-lg font-semibold">Assigned Tasks</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Due</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={4}>Loading...</TableCell></TableRow>
          ) : tasks.length === 0 ? (
            <TableRow><TableCell colSpan={4}>No tasks assigned</TableCell></TableRow>
          ) : (
            tasks.map(t => (
              <TableRow key={t.id}>
                <TableCell>{t.title}</TableCell>
                <TableCell className="capitalize">{t.status ?? '-'}</TableCell>
                <TableCell className="capitalize">{t.priority ?? '-'}</TableCell>
                <TableCell>{t.due_date ? new Date(t.due_date).toLocaleDateString() : '-'}</TableCell>
                <TableCell>
                  <Select value={t.status ?? 'pending'} onValueChange={(v: string) => updateStatus(t.id, v)}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function MyProfile({ user }: { user: AuthUser }) {
  const [emp, setEmp] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const employees = await apiService.getEmployees();
        const found = (employees ?? []).find(e => e.id === user.id) ?? null;
        setEmp(found);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user.id]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="text-lg">
            {user?.name ? user.name.split(' ').map(n => n[0]).join('') : "?"}
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="text-xl font-semibold">{user.name ?? 'Employee'}</h3>
          <p className="text-muted-foreground">{user.position ?? '—'}</p>
          <Badge className="mt-1">{user.department ?? '—'}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Details</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          {isLoading ? (
            <p>Loading...</p>
          ) : emp ? (
            <>
              <div>
                <Label>Name</Label>
                <div>{emp.name}</div>
              </div>
              <div>
                <Label>Email</Label>
                <div>{emp.email}</div>
              </div>
              <div>
                <Label>Department</Label>
                <div>{emp.department ?? '—'}</div>
              </div>
              <div>
                <Label>Position</Label>
                <div>{emp.position ?? '—'}</div>
              </div>
              <div>
                <Label>Phone</Label>
                <div>{emp.phone ?? '—'}</div>
              </div>
              <div>
                <Label>Experience</Label>
                <div>{emp.experience ?? 0} years</div>
              </div>
              <div>
                <Label>Salary</Label>
                <div>{emp.salary ?? 0}</div>
              </div>
              <div>
                <Label>Availability</Label>
                <div>{emp.availability ?? 0}%</div>
              </div>
              <div>
                <Label>Current Tasks</Label>
                <div>{emp.currentTasks ?? 0}</div>
              </div>
              <div>
                <Label>Join Date</Label>
                <div>{emp.joinDate ? new Date(emp.joinDate).toLocaleDateString() : '—'}</div>
              </div>
            </>
          ) : (
            <p>No profile found.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Skills</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading...</p>
          ) : emp && (emp.skills ?? []).length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {emp.skills.map((s, i) => (
                <Badge key={i} variant="secondary">{s.name} • L{s.level}</Badge>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No skills listed</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MyAttendance({ user, employeeId }: { user: AuthUser; employeeId: string | null }) {
  const [rows, setRows] = useState<Attendance[]>([] as any);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const all = await apiService.getAttendance();
        const id = employeeId ?? user.id;
        setRows((all ?? []).filter((r: any) => (r.employeeId ?? r.employee_id) === id) as any);
      } finally {
        setIsLoading(false);
      }
    };
    load();
    if (!employeeId) return;
    const channel = supabase
      .channel(`rt-attendance-${employeeId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, async () => {
        const all = await apiService.getAttendance();
        const id = employeeId ?? user.id;
        setRows((all ?? []).filter((r: any) => (r.employeeId ?? r.employee_id) === id) as any);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id, employeeId]);

  return (
    <div className="p-6 space-y-4">
      <h3 className="text-lg font-semibold">My Attendance</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={2}>Loading...</TableCell></TableRow>
          ) : rows.length === 0 ? (
            <TableRow><TableCell colSpan={2}>No records</TableCell></TableRow>
          ) : (
            rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.date}</TableCell>
                <TableCell className="capitalize">{r.status}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function MyLeaves({ user, employeeId }: { user: AuthUser; employeeId: string | null }) {
  const [rows, setRows] = useState<Leave[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState({ type: '', start: '', end: '', reason: '' });
  const load = async () => {
    const all = await apiService.getLeaves();
    const id = employeeId ?? user.id;
    setRows((all ?? []).filter(l => (l.employeeId ?? '') === id));
    setIsLoading(false);
  };
  useEffect(() => { load(); }, [user.id, employeeId]);
  useEffect(() => {
    if (!employeeId) return;
    const channel = supabase
      .channel(`rt-leaves-${employeeId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, () => {
        load();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [employeeId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiService.requestLeave({
      employeeId: (employeeId ?? user.id),
      type: form.type as any,
      startDate: form.start,
      endDate: form.end,
      reason: form.reason,
    } as any);
    setForm({ type: '', start: '', end: '', reason: '' });
    load();
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">My Leave Requests</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dates</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4}>Loading...</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={4}>No leave requests</TableCell></TableRow>
            ) : (
              rows.map(l => (
                <TableRow key={l.id}>
                  <TableCell>{l.startDate} — {l.endDate}</TableCell>
                  <TableCell className="capitalize">{(l as any).type ?? '-'}</TableCell>
                  <TableCell>{l.reason ?? '-'}</TableCell>
                  <TableCell className="capitalize">{l.status ?? '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div>
        <h4 className="font-semibold mb-2">Request Leave</h4>
        <form onSubmit={submit} className="grid md:grid-cols-4 gap-3">
          <div>
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v: string) => setForm(s => ({ ...s, type: v }))}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sick">Sick</SelectItem>
                <SelectItem value="vacation">Vacation</SelectItem>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Start</Label>
            <Input type="date" value={form.start} onChange={(e) => setForm(s => ({ ...s, start: e.target.value }))} />
          </div>
          <div>
            <Label>End</Label>
            <Input type="date" value={form.end} onChange={(e) => setForm(s => ({ ...s, end: e.target.value }))} />
          </div>
          <div className="md:col-span-4">
            <Label>Reason</Label>
            <Input value={form.reason} onChange={(e) => setForm(s => ({ ...s, reason: e.target.value }))} />
          </div>
          <div className="md:col-span-4 text-right">
            <Button type="submit">Submit</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DocumentsPlaceholder() {
  return (
    <div className="p-6">
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="font-medium mb-2">Documents</h3>
        <p className="text-muted-foreground">
          Document management and downloads will be available here
        </p>
      </div>
    </div>
  );
}