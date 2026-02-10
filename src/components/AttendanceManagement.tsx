import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { CalendarIcon, Clock, Download, Filter, Search, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { apiService } from '../utils/api';
import type { Employee } from '../utils/api';
import { supabase } from '../supabase';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

export function AttendanceManagement() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const emps = await apiService.getEmployees();
        setEmployees(emps);
      } catch (e) {
        console.error('Failed to load employees', e);
      }
    };
    loadEmployees();
  }, []);

  useEffect(() => {
    const loadAttendance = async () => {
      const day = format(selectedDate, 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', day)
        .order('created_at', { ascending: false });
      if (!error && data) setAttendanceData(data);
    };
    loadAttendance();
  }, [selectedDate]);

  const filteredAttendance = attendanceData.filter(attendance => {
    const employeeId = attendance.employee_id ?? attendance.employeeId;
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee) return false;

    const matchesEmployee = selectedEmployee === 'all' || employeeId === selectedEmployee;
    const matchesStatus = selectedStatus === 'all' || (attendance.status ?? '') === selectedStatus;
    const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (employee.department ?? '').toLowerCase().includes(searchTerm.toLowerCase());

    return matchesEmployee && matchesStatus && matchesSearch;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'late':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'absent':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'half-day':
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'default';
      case 'late':
        return 'secondary';
      case 'absent':
        return 'destructive';
      case 'half-day':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getEmployee = (employeeId: string): Employee | undefined => {
    return employees.find(emp => emp.id === employeeId);
  };

  const attendanceStats = {
    present: attendanceData.filter(a => a.status === 'present').length,
    late: attendanceData.filter(a => a.status === 'late').length,
    absent: attendanceData.filter(a => a.status === 'absent').length,
    halfDay: attendanceData.filter(a => a.status === 'half-day').length,
    total: attendanceData.length,
  };

  const attendanceRate = Math.round(((attendanceStats.present + attendanceStats.late + attendanceStats.halfDay) / attendanceStats.total) * 100);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Attendance Management</h1>
          <p className="text-muted-foreground">
            Track and manage employee attendance records
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => exportAttendanceCSV(filteredAttendance, employees, selectedDate)}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => exportAttendancePDF(filteredAttendance, employees, selectedDate)}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Present</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{attendanceStats.present}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Late</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{attendanceStats.late}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Absent</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{attendanceStats.absent}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Half Day</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{attendanceStats.halfDay}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Attendance Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full sm:w-60 justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'PPP') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date: Date | undefined) => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="late">Late</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
                <SelectItem value="half-day">Half Day</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Attendance - {format(selectedDate, 'EEEE, MMMM d, yyyy')}</CardTitle>
          <CardDescription>
            Employee attendance records for the selected date
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAttendance.map((attendance) => {
                const employee = getEmployee(attendance.employee_id ?? attendance.employeeId);
                if (!employee) return null;

                return (
                  <TableRow key={attendance.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {employee.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{employee.name}</p>
                          <p className="text-sm text-muted-foreground">{employee.position}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{employee.department}</Badge>
                    </TableCell>
                    <TableCell>
                      {attendance.checkin || attendance.checkIn || '-'}
                    </TableCell>
                    <TableCell>
                      {attendance.checkout || attendance.checkOut || '-'}
                    </TableCell>
                    <TableCell>
                      {(attendance.hours ?? 0)}h
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(attendance.status)}
                        <Badge variant={getStatusColor(attendance.status)} className="capitalize">
                          {attendance.status.replace('-', ' ')}
                        </Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {filteredAttendance.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="font-medium mb-2">No attendance records found</h3>
            <p className="text-muted-foreground">
              No records match your current filters for the selected date
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function exportAttendanceCSV(rows: any[], employees: Employee[], date: Date) {
  const headers = ['Employee', 'Department', 'Date', 'Check In', 'Check Out', 'Hours', 'Status'];
  const body = rows.map((r) => {
    const emp = employees.find(e => e.id === (r.employee_id ?? r.employeeId));
    return [
      emp?.name ?? 'Unknown',
      emp?.department ?? '',
      r.date,
      r.checkin ?? r.checkIn ?? '',
      r.checkout ?? r.checkOut ?? '',
      String(r.hours ?? 0),
      r.status ?? ''
    ];
  });
  const csv = [headers, ...body].map(row => row.map(v => String(v).replace(/,/g, ';')).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `attendance_${format(date, 'yyyy-MM-dd')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportAttendancePDF(rows: any[], employees: Employee[], date: Date) {
  const doc = new (jsPDF as any)();
  doc.text(`Attendance - ${format(date, 'yyyy-MM-dd')}`, 14, 15);
  const body = rows.map((r: any) => {
    const emp = employees.find(e => e.id === (r.employee_id ?? r.employeeId));
    return [
      emp?.name ?? 'Unknown',
      emp?.department ?? '',
      r.date,
      r.checkin ?? r.checkIn ?? '',
      r.checkout ?? r.checkOut ?? '',
      String(r.hours ?? 0),
      r.status ?? ''
    ];
  });
  (doc as any).autoTable({
    head: [['Employee', 'Department', 'Date', 'Check In', 'Check Out', 'Hours', 'Status']],
    body,
    startY: 25,
  });
  doc.save(`attendance_${format(date, 'yyyy-MM-dd')}.pdf`);
}