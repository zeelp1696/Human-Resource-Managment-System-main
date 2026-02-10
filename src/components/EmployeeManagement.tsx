import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Search, Mail, Phone, MapPin, Calendar, Briefcase, Trash2 } from 'lucide-react';
import { apiService } from '../utils/api';
import type { Employee } from '../utils/api';
import { AddEmployee } from './AddEmployee';

interface EmployeeManagementProps {
  refreshKey?: number;
  onEmployeeAdded?: () => void;
}

export function EmployeeManagement({ refreshKey = 0, onEmployeeAdded }: EmployeeManagementProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string>('employee');

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const employeesData = await apiService.getEmployees();
      setEmployees(employeesData ?? []);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [refreshKey]);

  useEffect(() => {
    // naive role read: from local user in App via window or fallback; for simplicity, read from localStorage if present
    try {
      const stored = localStorage.getItem('hrms_user_role');
      if (stored) setCurrentUserRole(stored);
    } catch {}
  }, []);

  const handleRemoveEmployee = async (employeeId: string) => {
    if (!confirm('Are you sure you want to remove this employee?')) return;
    try {
      await apiService.deleteEmployee(employeeId);
      setEmployees(prev => prev.filter(e => e.id !== employeeId));
    } catch (e) {
      console.error('Failed to delete employee', e);
    }
  };

  const departments = Array.from(new Set(employees.map(emp => emp.department).filter(Boolean)));

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch =
      (employee.name ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (employee.email ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (employee.position ?? '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDepartment = selectedDepartment === 'all' || employee.department === selectedDepartment;

    return matchesSearch && matchesDepartment;
  });

  const getSkillLevelColor = (level: number) => {
    if (level >= 4) return 'bg-green-100 text-green-800';
    if (level === 3) return 'bg-blue-100 text-blue-800';
    if (level === 2) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getAvailabilityColor = (availability: number) => {
    if (availability >= 80) return 'text-green-600';
    if (availability >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Employee Management</h1>
          <p className="text-muted-foreground">Manage employee profiles, skills, and assignments</p>
        </div>
        <AddEmployee onEmployeeAdded={() => { fetchEmployees(); onEmployeeAdded?.(); }} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Employee Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          [...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-100 rounded"></div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-3 bg-gray-100 rounded"></div>
                <div className="h-3 bg-gray-100 rounded w-3/4"></div>
                <div className="h-8 bg-gray-100 rounded"></div>
              </CardContent>
            </Card>
          ))
        ) : (
          filteredEmployees.map((employee) => (
            <Card key={employee.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>
                      {employee.name ? employee.name.split(' ').map(n => n[0]).join('') : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{employee.name ?? "Unnamed"}</CardTitle>
                    <CardDescription>{employee.position ?? "No position"}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{employee.department ?? "N/A"}</Badge>
                  <span className={`font-medium ${getAvailabilityColor(employee.availability ?? 0)}`}>
                    {employee.availability ?? 0}% available
                  </span>
                </div>

                {/* Skills */}
                <div className="space-y-2">
                  <Label>Top Skills</Label>
                  <div className="flex flex-wrap gap-1">
                    {(employee.skills ?? []).slice(0, 3).map((skill, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className={`text-xs ${getSkillLevelColor(skill.level)}`}
                      >
                        {skill.name} L{skill.level}
                      </Badge>
                    ))}
                    {(employee.skills ?? []).length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{(employee.skills ?? []).length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Experience + Tasks */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{employee.experience ?? 0} years exp.</span>
                  <span>{employee.currentTasks ?? 0} active tasks</span>
                </div>

                {/* Details dialog */}
                <div className="grid grid-cols-2 gap-2">
                  {currentUserRole === 'hr' && (
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => handleRemoveEmployee(employee.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Remove
                    </Button>
                  )}
                  <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setSelectedEmployee(employee)}
                    >
                      View Details
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Employee Details</DialogTitle>
                      <DialogDescription>
                        View comprehensive employee information including skills, experience, and current assignments.
                      </DialogDescription>
                    </DialogHeader>
                    {selectedEmployee && (
                      <Tabs defaultValue="overview" className="space-y-4">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="overview">Overview</TabsTrigger>
                          <TabsTrigger value="skills">Skills</TabsTrigger>
                          <TabsTrigger value="tasks">Tasks</TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="space-y-4">
                          <div className="flex items-center space-x-4">
                            <Avatar className="h-16 w-16">
                              <AvatarFallback className="text-lg">
                                {selectedEmployee.name ? selectedEmployee.name.split(' ').map(n => n[0]).join('') : "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="text-lg font-semibold">{selectedEmployee.name ?? "Unnamed"}</h3>
                              <p className="text-muted-foreground">{selectedEmployee.position ?? "No position"}</p>
                              <Badge className="mt-1">{selectedEmployee.department ?? "N/A"}</Badge>
                            </div>
                          </div>

                          <div className="grid gap-4">
                            <div className="flex items-center space-x-2"><Mail className="h-4 w-4" />
                              <span>{selectedEmployee.email ?? "No email"}</span></div>
                            <div className="flex items-center space-x-2"><Phone className="h-4 w-4" />
                              <span>{selectedEmployee.phone ?? "No phone"}</span></div>
                            <div className="flex items-center space-x-2"><MapPin className="h-4 w-4" />
                              <span>{'Address not available'}</span></div>
                            <div className="flex items-center space-x-2"><Calendar className="h-4 w-4" />
                              <span>Joined: {selectedEmployee.joinDate ? new Date(selectedEmployee.joinDate).toLocaleDateString() : "N/A"}</span></div>
                            <div className="flex items-center space-x-2"><Briefcase className="h-4 w-4" />
                              <span>{selectedEmployee.experience ?? 0} years of experience</span></div>
                          </div>
                        </TabsContent>

                        <TabsContent value="skills" className="space-y-4">
                          {(selectedEmployee.skills ?? []).length > 0 ? (
                            Object.entries(
                              (selectedEmployee.skills ?? []).reduce((acc, skill) => {
                                if (!acc[skill.category]) acc[skill.category] = [];
                                acc[skill.category].push(skill);
                                return acc;
                              }, {} as Record<string, typeof selectedEmployee.skills>)
                            ).map(([category, skills]) => (
                              <div key={category} className="space-y-2">
                                <h4 className="font-medium">{category}</h4>
                                <div className="grid gap-2">
                                  {skills.map((skill, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                                      <span>{skill.name}</span>
                                      <Badge className={getSkillLevelColor(skill.level)}>
                                        Level {skill.level}
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-muted-foreground">No skills listed</p>
                          )}
                        </TabsContent>

                        <TabsContent value="tasks" className="space-y-4">
                          <div className="text-center text-muted-foreground">
                            <Briefcase className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>Task history and current assignments will be shown here</p>
                            <p className="text-sm">Currently has {selectedEmployee.currentTasks ?? 0} active tasks</p>
                          </div>
                        </TabsContent>
                      </Tabs>
                    )}
                  </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {filteredEmployees.length === 0 && !isLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="font-medium mb-2">No employees found</h3>
            <p className="text-muted-foreground">Try adjusting your search criteria or add a new employee</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
