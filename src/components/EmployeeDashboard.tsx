// src/components/EmployeeDashboard.tsx
import React, { useState } from 'react';
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
import { mockTasks, mockEmployees, mockLeaveRequests } from '../data/mockData';
import { User as AuthUser } from '../types/auth';

interface EmployeeDashboardProps {
  user: AuthUser;
}

export function EmployeeDashboard({ user }: EmployeeDashboardProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Employee lookup (fallback if not found)
  const employeeData = mockEmployees.find(emp => emp.name === user.name) ?? {
    id: user.id,
    name: user.name,
    position: user.position ?? "N/A",
    department: user.department ?? "N/A",
    experience: 0,
    availability: 0,
    skills: []
  };

  const myTasks = mockTasks.filter(task => task.assigned_to === employeeData.id);
  const completedTasks = myTasks.filter(task => task.status === 'completed');
  const pendingTasks = myTasks.filter(task => ['pending', 'assigned'].includes(task.status));
  const inProgressTasks = myTasks.filter(task => task.status === 'in-progress');
  const myLeaveRequests = mockLeaveRequests.filter(req => req.employeeId === employeeData.id);
  const pendingLeaves = myLeaveRequests.filter(req => req.status === 'pending');

  const completionRate =
    myTasks.length > 0 ? Math.round((completedTasks.length / myTasks.length) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Welcome back, {user.name?.split(' ')[0] ?? "Employee"}!</h1>
          <p className="text-muted-foreground">Here's your personal dashboard</p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="outline">{employeeData.department}</Badge>
          <Avatar className="h-10 w-10">
            <AvatarFallback>
              {(employeeData.name ?? 'E').split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

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
          <h3>{employeeData.name}</h3>
          <p>{employeeData.position}</p>
          <p>{employeeData.experience} yrs exp.</p>
          <div className="mt-4">
            {(employeeData.skills ?? []).length > 0 ? (
              (employeeData.skills ?? []).slice(0, 5).map((s: any, i: number) => (
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
            Availability: {employeeData.availability ?? 0}%
            <Progress value={employeeData.availability ?? 0} className="mt-2 h-2" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
