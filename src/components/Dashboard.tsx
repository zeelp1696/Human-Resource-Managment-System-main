import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Users,
  Briefcase,
  Clock,
  TrendingUp,
  AlertTriangle,
  PlusCircle,
} from "lucide-react";
import { apiService, Employee, Task } from "../utils/api"; // import directly from api definitions
import { getSkillGaps } from "../utils/skillMatching";

interface DashboardProps {
  refreshEmployees?: number;
  refreshTasks?: number;
}

export function Dashboard({
  refreshEmployees = 0,
  refreshTasks = 0,
}: DashboardProps) {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    totalTasks: 0,
    pendingTasks: 0,
    completedTasks: 0,
    presentToday: 0,
    pendingLeaves: 0,
    departments: 0,
  });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [newEmployee, setNewEmployee] = useState({
    name: "",
    email: "",
    department: "",
  });
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium",
    due_date: "",
  });

  useEffect(() => {
    fetchData();
  }, [refreshEmployees, refreshTasks]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [dashboardStats, employeesData, tasksData] = await Promise.all([
        apiService.getDashboardStats(),
        apiService.getEmployees(),
        apiService.getTasks(),
      ]);

      setStats(dashboardStats);
      setEmployees(employeesData || []);
      setTasks(tasksData || []);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      setEmployees([]);
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEmployee = async () => {
    try {
      await apiService.addEmployee(newEmployee);
      setNewEmployee({ name: "", email: "", department: "" });
      fetchData();
    } catch (error) {
      console.error("Failed to add employee:", error);
    }
  };

  const handleCreateTask = async () => {
    try {
      await apiService.addTask(newTask);
      setNewTask({
        title: "",
        description: "",
        priority: "medium",
        due_date: "",
      });
      fetchData();
    } catch (error) {
      console.error("Failed to create task:", error);
    }
  };

  const avgAvailability =
    employees.length > 0
      ? Math.round(
        employees.reduce((acc, emp) => acc + (emp.availability || 0), 0) /
        employees.length
      )
      : 0;

  const skillGaps = getSkillGaps(employees as any, tasks as any).slice(0, 5);

  const recentTasks = tasks
    .slice()
    .sort(
      (a, b) =>
        new Date(b.createdAt || "").getTime() -
        new Date(a.createdAt || "").getTime()
    )
    .slice(0, 5);

  const departments = [...new Set(employees.map((emp) => emp.department))];

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "in-progress":
        return "bg-blue-500";
      case "assigned":
        return "bg-yellow-500";
      case "pending":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "urgent":
      case "high":
        return "destructive";
      case "medium":
        return "secondary";
      case "low":
        return "outline";
      default:
        return "outline";
    }
  };

  const getDepartmentStats = () => {
    return departments.map((dept) => {
      const deptEmployees = employees.filter(
        (emp) => emp.department === dept
      );
      const deptTasks = deptEmployees.reduce(
        (acc, emp) => acc + (emp.currentTasks || 0),
        0
      );

      return {
        name: dept,
        employeeCount: deptEmployees.length,
        activeTasks: deptTasks,
        avgAvailability:
          deptEmployees.length > 0
            ? Math.round(
              deptEmployees.reduce(
                (acc, emp) => acc + (emp.availability || 0),
                0
              ) / deptEmployees.length
            )
            : 0,
      };
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header + Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to your HRMS dashboard with intelligent task allocation
          </p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmployees}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeEmployees} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTasks}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingTasks} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.presentToday}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalEmployees > 0 ? Math.round((stats.presentToday / stats.totalEmployees) * 100) : 0}% attendance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.departments}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingLeaves} pending leaves
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Tasks & Skill Gaps */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Tasks</CardTitle>
            <CardDescription>Latest task assignments and progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTasks.length > 0 ? (
                recentTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{task.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {task.description || "No description"}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={getPriorityColor(task.priority)}>
                        {task.priority}
                      </Badge>
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(task.status)}`} />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No tasks found</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Skill Gaps</CardTitle>
            <CardDescription>Areas needing attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {skillGaps.length > 0 ? (
                skillGaps.map((gap, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{gap.skill}</p>
                      <p className="text-sm text-muted-foreground">
                        {gap.gap} employees needed
                      </p>
                    </div>
                    <Badge variant="destructive">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Critical
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No skill gaps identified</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department Stats */}
      {getDepartmentStats().length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Department Overview</CardTitle>
            <CardDescription>Performance by department</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {getDepartmentStats().map((dept) => (
                <div key={dept.name} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{dept.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {dept.employeeCount} employees • {dept.activeTasks} active tasks
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{dept.avgAvailability}%</div>
                    <div className="text-xs text-muted-foreground">availability</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
