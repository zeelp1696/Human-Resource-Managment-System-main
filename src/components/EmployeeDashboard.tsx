// src/components/EmployeeDashboard.tsx
import React, { useState, useEffect } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import {
  Briefcase, CheckCircle, AlertTriangle, Calendar as CalendarIcon, User, Award, Clock
} from 'lucide-react';
import { apiService } from '../utils/api';
import type { Employee, Task, Leave } from '../utils/api';
import { User as AuthUser } from '../types/auth';
import { QuickPunchButton } from './QuickPunchButton';

interface EmployeeDashboardProps {
  user: AuthUser;
}

export function EmployeeDashboard({ user }: EmployeeDashboardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [employeeData, setEmployeeData] = useState<Employee | null>(null);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [myLeaveRequests, setMyLeaveRequests] = useState<Leave[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [employees, tasks, leaves] = await Promise.all([
          apiService.getEmployees(),
          apiService.getTasks(),
          apiService.getLeaves(),
        ]);

        const match = (employees ?? []).find(
          (e) => (e.email ?? '').toLowerCase() === (user.email ?? '').toLowerCase()
        );
        setEmployeeData(match ?? null);

        const empId = match?.id ?? user.id;
        setMyTasks((tasks ?? []).filter((t) => (t.assigned_to ?? '') === empId));
        setMyLeaveRequests((leaves ?? []).filter((l) => (l.employeeId ?? '') === empId));
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user.email, user.id]);

  const emp = employeeData ?? {
    id: user.id,
    name: user.name,
    position: user.position ?? 'N/A',
    department: user.department ?? 'N/A',
    experience: 0,
    availability: 0,
    skills: [] as { name: string; level: number; category: string }[],
  };

  const completedTasks = myTasks.filter((t) => t.status === 'completed');
  const inProgressTasks = myTasks.filter((t) => t.status === 'in-progress');
  const pendingTasks = myTasks.filter((t) => ['pending', 'assigned'].includes(t.status ?? ''));
  const pendingLeaves = myLeaveRequests.filter((l) => l.status === 'pending');
  const completionRate = myTasks.length > 0 ? Math.round((completedTasks.length / myTasks.length) * 100) : 0;

  const getStatusColor = (status: string) => {
    if (status === 'completed') return 'text-green-500';
    if (status === 'in-progress') return 'text-blue-500';
    return 'text-yellow-500';
  };

  const getPriorityBadge = (priority: string) => {
    if (priority === 'high' || priority === 'urgent') return 'destructive';
    if (priority === 'medium') return 'secondary';
    return 'outline';
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (<div key={i} className="h-28 bg-muted rounded"></div>))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {user.name?.split(' ')[0] ?? 'Employee'}!</h1>
        <p className="text-muted-foreground">Here's your personal dashboard</p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">My Tasks</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{myTasks.length}</div>
            <p className="text-xs text-muted-foreground mt-1">{inProgressTasks.length} in progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{completedTasks.length}</div>
            <p className="text-xs text-muted-foreground mt-1">{completionRate}% completion rate</p>
            <Progress value={completionRate} className="mt-2 h-1" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingTasks.length}</div>
            <p className="text-xs text-muted-foreground mt-1">tasks awaiting action</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Leave Requests</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingLeaves.length}</div>
            <p className="text-xs text-muted-foreground mt-1">pending approval</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Punch Widget */}
        <div className="lg:col-span-1">
          <QuickPunchButton employeeId={emp.id} />
        </div>

        {/* My Tasks List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              My Assigned Tasks
            </CardTitle>
            <CardDescription>Tasks currently assigned to you</CardDescription>
          </CardHeader>
          <CardContent>
            {myTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No tasks assigned yet.</p>
            ) : (
              <div className="space-y-3">
                {myTasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className={`h-3 w-3 ${getStatusColor(task.status ?? '')}`} />
                        <span className="text-xs text-muted-foreground capitalize">{task.status?.replace('-', ' ')}</span>
                        {task.due_date && (
                          <span className="text-xs text-muted-foreground">· Due {new Date(task.due_date).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <Badge variant={getPriorityBadge(task.priority ?? 'medium') as any} className="ml-2 shrink-0">
                      {task.priority}
                    </Badge>
                  </div>
                ))}
                {myTasks.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">+{myTasks.length - 5} more tasks</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Profile & Skills */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            My Profile & Skills
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                  {(emp.name ?? 'E').split(' ').map(n => n[0]).join('').slice(0,2)}
                </div>
                <div>
                  <p className="font-semibold text-lg">{emp.name}</p>
                  <p className="text-sm text-muted-foreground">{emp.position}</p>
                  <Badge variant="outline" className="mt-1">{emp.department}</Badge>
                </div>
              </div>
              <div className="pt-2 space-y-1 text-sm text-muted-foreground">
                <p>{(emp as any).experience ?? 0} years experience</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Skills</span>
              </div>
              {((emp as any).skills ?? []).length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {((emp as any).skills ?? []).slice(0, 6).map((s: any, i: number) => (
                    <Badge key={i} variant="secondary">{s.name} <span className="ml-1 opacity-60">L{s.level}</span></Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No skills listed. Add skills in your profile.</p>
              )}
              <div className="pt-2">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Availability</span>
                  <span className="font-medium">{(emp as any).availability ?? 0}%</span>
                </div>
                <Progress value={(emp as any).availability ?? 0} className="h-2" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
