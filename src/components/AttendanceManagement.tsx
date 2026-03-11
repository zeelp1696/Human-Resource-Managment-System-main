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
import { CalendarIcon, Clock, Download, Filter, Search, CheckCircle, XCircle, AlertCircle, Coffee } from 'lucide-react';
import { apiService } from '../utils/api';
import type { Employee } from '../utils/api';
import type { User } from '../types/auth';
import { supabase } from '../supabase';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format, differenceInMinutes } from 'date-fns';
import { PunchWidget } from './PunchWidget';

interface AttendanceManagementProps {
  currentUser?: User | null;
}

export function AttendanceManagement({ currentUser }: AttendanceManagementProps) {
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

    // Set up real-time subscription for attendance updates
    const day = format(selectedDate, 'yyyy-MM-dd');
    const subscription = supabase
      .channel('attendance-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'attendance',
        filter: `date=eq.${day}`
      }, () => {
        loadAttendance(); // Reload attendance when changes occur
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [selectedDate]);

  // Filter employees based on role
  const visibleEmployees = React.useMemo(() => {
    if (!currentUser) return employees;
    
    if (currentUser.role === 'employee') {
      // Employees only see themselves
      return employees.filter(emp => emp.id === currentUser.id);
    } else if (currentUser.role === 'hr') {
      // HR sees everyone except Admin
      return employees.filter(emp => emp.role !== 'admin');
    } else if (currentUser.role === 'manager') {
      // Manager sees themselves + all employees (not HR/Admin)
      return employees.filter(emp => 
        emp.id === currentUser.id || emp.role === 'employee'
      );
    } else {
      // Admin sees everyone
      return employees;
    }
  }, [employees, currentUser]);

  const filteredAttendance = attendanceData.filter(attendance => {
    const employeeId = attendance.employee_id ?? attendance.employeeId;
    const employee = visibleEmployees.find(emp => emp.id === employeeId);
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
      case 'on-break':
        return <Coffee className="h-4 w-4 text-orange-600" />;
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

  const getCurrentPunchStatus = (attendance: any) => {
    if (!attendance.check_in && !attendance.checkIn) {
      return { label: 'Not Started', color: 'outline', icon: null };
    }
    if (attendance.check_out || attendance.checkOut) {
      return { label: 'Checked Out', color: 'default', icon: <CheckCircle className="h-3 w-3" /> };
    }
    if (attendance.break_start || attendance.breakStart) {
      if (!(attendance.break_end || attendance.breakEnd)) {
        return { label: 'On Break', color: 'secondary', icon: <Coffee className="h-3 w-3" /> };
      }
    }
    return { label: 'Working', color: 'default', icon: <Clock className="h-3 w-3 text-green-600" /> };
  };

  const formatTime = (timeStr: string | null | undefined) => {
    if (!timeStr) return '-';
    try {
      return format(new Date(timeStr), 'hh:mm a');
    } catch {
      return timeStr;
    }
  };

  const getLiveWorkHours = (attendance: any) => {
    const checkIn = attendance.check_in || attendance.checkIn;
    const checkOut = attendance.check_out || attendance.checkOut;
    
    if (!checkIn) return '-';
    if (checkOut) {
      return `${(attendance.total_hours || attendance.totalHours || 0).toFixed(2)}h`;
    }
    
    // Calculate live hours
    const startTime = new Date(checkIn);
    const minutes = differenceInMinutes(new Date(), startTime);
    const hours = (minutes / 60).toFixed(2);
    return `${hours}h (live)`;
  };

  const getBreakInfo = (attendance: any) => {
    const breakDuration = attendance.break_duration || attendance.breakDuration || 0;
    if (breakDuration === 0) return '-';
    
    const excessMinutes = Math.max(0, breakDuration - 60);
    if (excessMinutes > 0) {
      return (
        <span className="text-red-600 font-semibold">
          {breakDuration} min (₹{(excessMinutes * 0.5).toFixed(2)} deducted)
        </span>
      );
    }
    return `${breakDuration} min`;
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
      {/* Employee Punch Widget */}
      {currentUser && currentUser.role === 'employee' && (
        <div className="max-w-2xl mx-auto mb-8">
          <PunchWidget 
            employeeId={currentUser.id} 
            employeeName={currentUser.name || 'Employee'} 
          />
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1>Attendance Management</h1>
          <p className="text-muted-foreground">
            {currentUser?.role === 'employee' 
              ? 'View your attendance records and history'
              : 'Track and manage employee attendance records'}
          </p>
        </div>
        {currentUser?.role !== 'employee' && (
          <div className="flex gap-2">
            <Button onClick={() => exportAttendanceCSV(filteredAttendance, visibleEmployees, selectedDate)}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={() => exportAttendancePDF(filteredAttendance, visibleEmployees, selectedDate)}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        )}
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
                {visibleEmployees.map((employee) => (
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
                <SelectItem value="on-break">On Break</SelectItem>
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
                <TableHead>Current Status</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Work Hours</TableHead>
                <TableHead>Break Time</TableHead>
                <TableHead>Final Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAttendance.map((attendance) => {
                const employee = getEmployee(attendance.employee_id ?? attendance.employeeId);
                if (!employee) return null;

                const punchStatus = getCurrentPunchStatus(attendance);

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
                      <Badge variant={punchStatus.color as any} className="capitalize flex items-center gap-1 w-fit">
                        {punchStatus.icon}
                        {punchStatus.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{formatTime(attendance.check_in || attendance.checkIn)}</span>
                        {(attendance.is_late || attendance.isLate) && (
                          <Badge variant="destructive" className="mt-1 w-fit text-xs">Late</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{formatTime(attendance.check_out || attendance.checkOut)}</span>
                        {(attendance.is_overtime || attendance.isOvertime) && (
                          <Badge variant="secondary" className="mt-1 w-fit text-xs">
                            OT: {(attendance.overtime_hours || attendance.overtimeHours || 0).toFixed(2)}h
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getLiveWorkHours(attendance)}
                    </TableCell>
                    <TableCell>
                      {getBreakInfo(attendance)}
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