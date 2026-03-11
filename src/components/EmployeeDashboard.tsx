// src/components/EmployeeDashboard.tsx
import React, { useState, useEffect } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Briefcase, Clock, Calendar as CalendarIcon,
  CheckCircle, AlertTriangle, Target, User,
  FileText, Bell, Award
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

        // Find this employee by email match
        const match = (employees ?? []).find(
          (e) => (e.email ?? '').toLowerCase() === (user.email ?? '').toLowerCase()
        );
        setEmployeeData(match ?? null);

        // Filter tasks assigned to this employee
        const empId = match?.id ?? user.id;
        setMyTasks((tasks ?? []).filter((t) => (t.assigned_to ?? '') === empId));

        // Filter leave requests for this employee
        setMyLeaveRequests(
          (leaves ?? []).filter((l) => (l.employeeId ?? '') === empId)
        );
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user.email, user.id]);

  // Fallback data when employee not found
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
  const pendingTasks = myTasks.filter((t) => ['pending', 'assigned'].includes(t.status ?? ''));
  const pendingLeaves = myLeaveRequests.filter((l) => l.status === 'pending');

  const completionRate =
    myTasks.length > 0 ? Math.round((completedTasks.length / myTasks.length) * 100) : 0;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Welcome back, {user.name?.split(' ')[0] ?? "Employee"}!</h1>
          <p className="text-muted-foreground">Here's your personal dashboard</p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="outline">{emp.department}</Badge>
          <Avatar className="h-10 w-10">
            <AvatarFallback>
              {(emp.name ?? 'E').split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Punch Widget */}
        <div className="lg:col-span-1">
          <QuickPunchButton employeeId={emp.id} />
        </div>

        {/* Right Column: Stats and Profile */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card><CardHeader><CardTitle>My Tasks</CardTitle></CardHeader>
              <CardContent>{myTasks.length} total</CardContent></Card>
            <Card><CardHeader><CardTitle>Completed</CardTitle></CardHeader>
              <CardContent>{completedTasks.length} ({completionRate}%)</CardContent></Card>
            <Card><CardHeader><CardTitle>Pending</CardTitle></CardHeader>
              <CardContent>{pendingTasks.length}</CardContent></Card>
            <Card><CardHeader><CardTitle>Leave Requests</CardTitle></CardHeader>
              <CardContent>{pendingLeaves.length}</CardContent></Card>
          </div>

          {/* Profile */}
          <Card>
            <CardHeader><CardTitle>My Profile & Skills</CardTitle></CardHeader>
            <CardContent>
              <h3>{emp.name}</h3>
              <p>{emp.position}</p>
              <p>{(emp as any).experience ?? 0} yrs exp.</p>
              <div className="mt-4">
                {((emp as any).skills ?? []).length > 0 ? (
                  ((emp as any).skills ?? []).slice(0, 5).map((s: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>{s.name}</span>
                      <Badge variant="outline">L{s.level}</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No skills listed</p>
                )}
              </div>
              <div className="mt-4">
                Availability: {(emp as any).availability ?? 0}%
                <Progress value={(emp as any).availability ?? 0} className="mt-2 h-2" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
