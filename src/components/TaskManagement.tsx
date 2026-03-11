import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Search, Plus, Calendar, Clock, User, Target, AlertTriangle, CheckCircle, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../utils/api';
import type { Task, Employee } from '../utils/api';
import type { User as AuthUser } from '../types/auth';
import { findBestEmployeesForTask } from '../utils/skillMatching';
import { AddEmployee } from './AddEmployee';
import type { UserRole } from '../types/auth';
import { canManageTasks } from '../utils/permissions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

interface TaskManagementProps {
  refreshKey?: number;
  onTaskCreated?: () => void;
  userRole?: UserRole;
  currentUser?: AuthUser | null;
}

export function TaskManagement({ refreshKey = 0, userRole, currentUser }: TaskManagementProps) {
  // HR cannot create or assign tasks
  // Only Manager and Admin can create/assign tasks
  const canEdit = userRole === 'admin' || userRole === 'manager';
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showNewTaskDialog, setShowNewTaskDialog] = useState(false);
  const [showAddEmployeeDialog, setShowAddEmployeeDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'archive'>('active');

  // Form states for creating task
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [due_date, setdue_date] = useState('');
  const [estimatedHours, setEstimatedHours] = useState(0);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  // Get unique skills from employees based on role
  const availableSkills = useMemo(() => {
    const skillsSet = new Set<string>();
    
    if (!currentUser) {
      // If no current user, show all skills
      employees.forEach(emp => {
        emp.skills?.forEach(skill => {
          if (skill.name) skillsSet.add(skill.name);
        });
      });
    } else {
      // Filter employees based on who can be assigned tasks
      employees.forEach(emp => {
        let shouldIncludeSkills = false;
        
        // For Admin: show skills from self + employees (exclude other admins/HR/managers)
        if (currentUser.role === 'admin') {
          shouldIncludeSkills = emp.id === currentUser.id || emp.role === 'employee';
        }
        // For HR: show skills from self + employees (exclude other HR/admins/managers)
        else if (currentUser.role === 'hr') {
          shouldIncludeSkills = emp.id === currentUser.id || emp.role === 'employee';
        } 
        // For Manager: show skills from self + employees (exclude HR/admin)
        else if (currentUser.role === 'manager') {
          shouldIncludeSkills = emp.id === currentUser.id || emp.role === 'employee';
        }
        // For Employee: only show employee skills
        else if (currentUser.role === 'employee') {
          shouldIncludeSkills = emp.role === 'employee';
        }
        
        if (shouldIncludeSkills) {
          emp.skills?.forEach(skill => {
            if (skill.name) skillsSet.add(skill.name);
          });
        }
      });
    }
    
    return Array.from(skillsSet).sort();
  }, [employees, currentUser]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tasksData, employeesData] = await Promise.all([
          apiService.getTasks(),
          apiService.getEmployees(),
        ]);
        setTasks(tasksData);
        setEmployees(employeesData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [refreshKey]);

  // Auto-delete completed tasks older than 24 hours
  useEffect(() => {
    const deleteOldCompletedTasks = async () => {
      const now = new Date().getTime();
      const oneDayMs = 24 * 60 * 60 * 1000;
      
      const tasksToDelete = tasks.filter(task => {
        if (task.status === 'completed' && task.completed_at) {
          const completedTime = new Date(task.completed_at).getTime();
          return now - completedTime > oneDayMs;
        }
        return false;
      });

      for (const task of tasksToDelete) {
        try {
          await apiService.deleteTask(task.id);
        } catch (error) {
          console.error('Failed to auto-delete task:', error);
        }
      }

      if (tasksToDelete.length > 0) {
        setTasks(prev => prev.filter(t => !tasksToDelete.includes(t)));
      }
    };

    const interval = setInterval(deleteOldCompletedTasks, 60000); // Check every minute
    deleteOldCompletedTasks(); // Run immediately

    return () => clearInterval(interval);
  }, [tasks]);

  // Filter tasks based on role visibility
  const visibleTasks = React.useMemo(() => {
    if (!currentUser) return tasks;
    
    // Manager and Admin see all tasks
    if (currentUser.role === 'admin' || currentUser.role === 'manager') {
      return tasks;
    }
    
    // HR and Employee only see tasks assigned to them
    if (currentUser.role === 'hr' || currentUser.role === 'employee') {
      return tasks.filter(task => task.assigned_to === currentUser.id);
    }
    
    return tasks;
  }, [tasks, currentUser]);

  const filteredTasks = visibleTasks.filter(task => {
    const matchesSearch =
      (task.title ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.description ?? '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = selectedStatus === 'all' || task.status === selectedStatus;
    const matchesPriority = selectedPriority === 'all' || task.priority === selectedPriority;
    
    // Filter by active/archive tab
    const isCompleted = task.status === 'completed';
    const matchesTab = activeTab === 'archive' ? isCompleted : !isCompleted;

    return matchesSearch && matchesStatus && matchesPriority && matchesTab;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in-progress': return 'default';
      case 'assigned': return 'secondary';
      case 'pending': return 'destructive';
      default: return 'outline';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in-progress': return <Clock className="h-4 w-4 text-blue-600" />;
      case 'assigned': return <User className="h-4 w-4 text-yellow-600" />;
      case 'pending': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return null;
    }
  };

  const assignTaskToEmployee = async (taskId: string, employeeId: string) => {
    try {
      const updatedTask = await apiService.assignTask(taskId, employeeId);
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId ? updatedTask : task
        )
      );
      toast.success(`Task assigned to ${getEmployeeName(employeeId)}!`);
    } catch (error) {
      console.error('Failed to assign task:', error);
      toast.error('Failed to assign task. Check console for details.');
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const updates: Partial<Task> = { status: newStatus };
      
      // If completing, set to completed and record completion time
      if (newStatus === 'completed') {
        updates.progress = 100;
        updates.completed_at = new Date().toISOString();
      }
      
      const updatedTask = await apiService.updateTask(taskId, updates);
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId ? updatedTask : task
        )
      );
      setSelectedTask(prev => prev?.id === taskId ? updatedTask : prev);
      toast.success(`Task status updated to ${newStatus}!`);
    } catch (error) {
      console.error('Failed to update task status:', error);
      toast.error('Failed to update task status.');
    }
  };

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? employee.name : 'Unknown Employee';
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const requiredSkills = selectedSkills.map(skillName => ({
        name: skillName,
        level: 3, // Default level
        importance: 'required' as const,
        category: 'general' // Default category
      }));

      const newTask = await apiService.addTask({
        title,
        description: description || null,
        priority,
        status: 'pending',
        due_date: due_date || null,
        estimatedHours,
        assigned_to: null,
        requiredSkills,
      });

      setTasks((prev) => [...prev, newTask]);
      setShowNewTaskDialog(false);

      // Reset form
      setTitle('');
      setDescription('');
      setdue_date('');
      setEstimatedHours(0);
      setPriority('medium');
      setSelectedSkills([]);
      toast.success('Task created successfully!');
    } catch (err) {
      console.error('Failed to create task:', err);
      toast.error('Failed to create task. Please try again.');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Task Management</h1>
          <p className="text-muted-foreground">
            Intelligent task assignment based on employee skills
          </p>
        </div>
        <div className="flex space-x-2">
          {canEdit && (
            <Button onClick={() => setShowNewTaskDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Task
            </Button>
          )}
        </div>
      </div>

      {/* Create Task Dialog */}
      <Dialog open={showNewTaskDialog} onOpenChange={setShowNewTaskDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
            <DialogDescription>
              Fill out the details to create a new task.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTask} className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>

            <div>
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} required />
            </div>

            <div>
              <Label>Due Date</Label>
              <Input type="date" value={due_date} onChange={(e) => setdue_date(e.target.value)} required />
            </div>

            <div>
              <Label>Estimated Hours</Label>
              <Input type="number" value={estimatedHours} onChange={(e) => setEstimatedHours(Number(e.target.value))} required />
            </div>

            <div>
              <Label>Priority</Label>
              <select
                className="w-full border rounded p-2"
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <Label>Required Skills (Optional)</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Select skills to find best matching employees
              </p>
              <div className="border rounded p-3 max-h-48 overflow-y-auto space-y-2">
                {availableSkills.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    No specific skills required - anyone can be assigned this task
                  </p>
                ) : (
                  availableSkills.map((skill) => (
                    <label key={skill} className="flex items-center space-x-2 cursor-pointer hover:bg-accent p-1 rounded">
                      <input
                        type="checkbox"
                        checked={selectedSkills.includes(skill)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSkills([...selectedSkills, skill]);
                          } else {
                            setSelectedSkills(selectedSkills.filter((s) => s !== skill));
                          }
                        }}
                        className="h-4 w-4"
                      />
                      <span className="text-sm">{skill}</span>
                    </label>
                  ))
                )}
              </div>
              {selectedSkills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedSkills.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Button type="submit">Save Task</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Employee Dialog */}
      <Dialog open={showAddEmployeeDialog} onOpenChange={setShowAddEmployeeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Employee</DialogTitle>
            <DialogDescription>
              Add a new employee to the system.
            </DialogDescription>
          </DialogHeader>
          <AddEmployee
            onEmployeeAdded={(employee) => {
              setEmployees((prev) => [...prev, employee]);
              setShowAddEmployeeDialog(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={activeTab === 'active' ? 'default' : 'outline'}
          onClick={() => setActiveTab('active')}
        >
          Active Tasks
        </Button>
        <Button
          variant={activeTab === 'archive' ? 'default' : 'outline'}
          onClick={() => setActiveTab('archive')}
        >
          Archive
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task List */}
      <div className="grid gap-4">
        {filteredTasks.map((task) => (
          <Card key={task.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(task.status)}
                    <h3 className="font-semibold">{task.title}</h3>
                    <Badge variant={getPriorityColor(task.priority)}>{task.priority}</Badge>
                    <Badge variant={getStatusColor(task.status)}>
                      {task.status.replace('-', ' ')}
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {task.description}
                  </p>

                  <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{(task.estimatedHours ?? 0)}h estimated</span>
                    </div>
                    {task.assigned_to && (
                      <div className="flex items-center space-x-1">
                        <User className="h-4 w-4" />
                        <span>Assigned to {getEmployeeName(task.assigned_to)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTask(task)}
                      >
                        View Details
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <DialogHeader>
                        <DialogTitle>Task Details & Smart Assignment</DialogTitle>
                        <DialogDescription>
                          View task details and get AI-powered employee recommendations based on skills and availability.
                        </DialogDescription>
                      </DialogHeader>
                      {selectedTask && (
                        <TaskDetailsDialog
                          task={selectedTask}
                          onAssign={assignTaskToEmployee}
                          onDelete={async (taskId) => {
                            try {
                              await apiService.deleteTask(taskId);
                              setTasks(prev => prev.filter(t => t.id !== taskId));
                              toast.success('Task deleted successfully!');
                            } catch (error) {
                              console.error('Failed to delete task:', error);
                              toast.error('Failed to delete task.');
                            }
                          }}
                          onUpdateStatus={updateTaskStatus}
                          employees={employees}
                          canAssign={canEdit}
                          currentUser={currentUser}
                        />
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTasks.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="font-medium mb-2">No tasks found</h3>
            <p className="text-muted-foreground">
              Try adjusting your filters or create a new task
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TaskDetailsDialog({ 
  task, 
  onAssign, 
  onDelete,
  onUpdateStatus,
  employees, 
  canAssign = true,
  currentUser 
}: { 
  task: Task; 
  onAssign: (taskId: string, employeeId: string) => void; 
  onDelete: (taskId: string) => void;
  onUpdateStatus?: (taskId: string, newStatus: string) => void;
  employees: Employee[]; 
  canAssign?: boolean;
  currentUser?: AuthUser | null;
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  
  // Define role hierarchy (lower number = higher role)
  const roleHierarchy: Record<string, number> = {
    'admin': 0,
    'hr': 1,
    'manager': 2,
    'employee': 3
  };

  // Filter employees based on role hierarchy and assignment permissions
  const assignableEmployees = React.useMemo(() => {
    if (!currentUser) return employees;
    
    const currentRoleLevel = roleHierarchy[currentUser.role] ?? 3;
    
    return employees.filter(emp => {
      const empRoleLevel = roleHierarchy[emp.role] ?? 3;
      
      // Employee can only assign to employees (not to HR, Manager, Admin)
      if (currentUser.role === 'employee') {
        return emp.role === 'employee';
      }
      
      // Manager can assign to themselves + employees (not HR or Admin)
      if (currentUser.role === 'manager') {
        return emp.id === currentUser.id || emp.role === 'employee';
      }
      
      // Admin can assign to anyone
      if (currentUser.role === 'admin') {
        return true;
      }
      
      // HR and Employee cannot assign tasks (should not reach here)
      return false;
    });
  }, [employees, currentUser]);

  // Filter by skill matching
  const bestMatches = React.useMemo(() => {
    const matches = findBestEmployeesForTask(assignableEmployees, task);
    
    // If task has required skills, only show employees with matching skills
    if (task.requiredSkills && task.requiredSkills.length > 0) {
      return matches.filter(match => match.matchScore > 0);
    }
    
    // If no required skills, show all assignable employees
    return matches;
  }, [assignableEmployees, task]);

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Employee viewing a task assigned to them → only show Task Details + status dropdown
  // Match by id OR by email (handles auth UUID vs DB UUID mismatch)
  const myEmployeeRecord = currentUser
    ? employees.find(e => e.id === currentUser.id || e.email === currentUser.email)
    : null;
  const myEmployeeId = myEmployeeRecord?.id ?? currentUser?.id;
  const isTaskAssignedToMe = currentUser?.role === 'employee' && task.assigned_to === myEmployeeId;

  if (isTaskAssignedToMe) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-lg">{task.title}</h3>
          <p className="text-muted-foreground">{task.description}</p>
        </div>
        {task.status !== 'completed' && (
          <div className="pt-4 border-t">
            <label className="block text-sm font-medium mb-2">Update Task Status</label>
            <Select
              value={task.status}
              onValueChange={(value) => onUpdateStatus?.(task.id, value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {task.status === 'completed' && (
          <div className="pt-4 border-t text-sm text-muted-foreground">
            ✅ This task is completed.
          </div>
        )}
      </div>
    );
  }

  return (
    <Tabs defaultValue="details" className="space-y-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="details">Task Details</TabsTrigger>
        <TabsTrigger value="recommendations">Smart Recommendations</TabsTrigger>
      </TabsList>

      <TabsContent value="details" className="space-y-4">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg">{task.title}</h3>
            <p className="text-muted-foreground">{task.description}</p>
          </div>

          {/* Status Update Dropdown - Only show if user is assigned to this task */}
          {currentUser && task.assigned_to === myEmployeeId && task.status !== 'completed' && (
            <div className="pt-4 border-t">
              <label className="block text-sm font-medium mb-2">Update Task Status</label>
              <Select
                value={task.status}
                onValueChange={(value) => {
                  if (onUpdateStatus) {
                    onUpdateStatus(task.id, value);
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          
          {canAssign && (
            <div className="flex justify-end pt-4 border-t">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Task
              </Button>
            </div>
          )}
        </div>
        
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the task "{task.title}". This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  onDelete(task.id);
                  setShowDeleteConfirm(false);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TabsContent>

      <TabsContent value="recommendations" className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2">Best Employee Matches</h3>
        </div>

        <div className="space-y-4">
          {bestMatches.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">
                  No matching employees found. Try adjusting the task requirements or skills.
                </p>
              </CardContent>
            </Card>
          ) : (
            bestMatches.map((match) => (
              <Card key={match.employee.id} className="relative">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarFallback>
                          {match.employee.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-medium">{match.employee.name}</h4>
                        <p className="text-sm text-muted-foreground">{match.employee.position}</p>
                        <Badge variant="outline" className="mt-1">{match.employee.department}</Badge>
                      </div>
                    </div>

                    <div className="text-right space-y-2">
                      <div>
                        <div className="flex items-center space-x-2">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className={`font-semibold ${getMatchScoreColor(match.matchScore)}`}>
                            {match.matchScore}% match
                          </span>
                        </div>
                      </div>

                      {canAssign && (
                        <Button
                          size="sm"
                          onClick={() => onAssign(task.id, match.employee.id)}
                          disabled={task.assigned_to === match.employee.id}
                        >
                          {task.assigned_to === match.employee.id ? 'Assigned' : 'Assign Task'}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
