import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Label } from './ui/label';
import { Search, Plus, Calendar, Clock, User, Target, AlertTriangle, CheckCircle, Star } from 'lucide-react';
import { apiService } from '../utils/api';
import type { Task, Employee } from '../utils/api';
import { findBestEmployeesForTask } from '../utils/skillMatching';
import { AddEmployee } from './AddEmployee';

interface TaskManagementProps {
  refreshKey?: number;
  onTaskCreated?: () => void;
}

export function TaskManagement({ refreshKey = 0 }: TaskManagementProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showNewTaskDialog, setShowNewTaskDialog] = useState(false);
  const [showAddEmployeeDialog, setShowAddEmployeeDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Form states for creating task
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [due_date, setdue_date] = useState('');
  const [estimatedHours, setEstimatedHours] = useState(0);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');

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

  const filteredTasks = tasks.filter(task => {
    const matchesSearch =
      (task.title ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.description ?? '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = selectedStatus === 'all' || task.status === selectedStatus;
    const matchesPriority = selectedPriority === 'all' || task.priority === selectedPriority;

    return matchesSearch && matchesStatus && matchesPriority;
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
    } catch (error) {
      console.error('Failed to assign task:', error);
    }
  };

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? employee.name : 'Unknown Employee';
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newTask = await apiService.addTask({
        title,
        description: description || null,
        priority,
        status: 'pending',
        due_date: due_date || null,
        estimatedHours,
        assigned_to: null,
        requiredSkills: [],
      });

      setTasks((prev) => [...prev, newTask]);
      setShowNewTaskDialog(false);

      // Reset form
      setTitle('');
      setDescription('');
      setdue_date('');
      setEstimatedHours(0);
      setPriority('medium');
    } catch (err) {
      console.error('Failed to create task:', err);
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
          <Button onClick={() => setShowNewTaskDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Task
          </Button>
        </div>
      </div>

      {/* Create Task Dialog */}
      <Dialog open={showNewTaskDialog} onOpenChange={setShowNewTaskDialog}>
        <DialogContent>
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
              <Label>due_date</Label>
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
                          employees={employees}
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

function TaskDetailsDialog({ task, onAssign, employees }: { task: Task; onAssign: (taskId: string, employeeId: string) => void; employees: Employee[] }) {
  const bestMatches = findBestEmployeesForTask(employees, task);

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

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
        </div>
      </TabsContent>

      <TabsContent value="recommendations" className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2">Best Employee Matches</h3>
        </div>

        <div className="space-y-4">
          {bestMatches.map((match) => (
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

                    <Button
                      size="sm"
                      onClick={() => onAssign(task.id, match.employee.id)}
                      disabled={task.assigned_to === match.employee.id}
                    >
                      {task.assigned_to === match.employee.id ? 'Assigned' : 'Assign Task'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}
