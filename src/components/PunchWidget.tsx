import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Clock, 
  LogIn, 
  LogOut, 
  Coffee, 
  AlertCircle, 
  CheckCircle2,
  Timer,
  TrendingUp
} from 'lucide-react';
import { apiService, type Attendance } from '../utils/api';
import { format } from 'date-fns';

interface PunchWidgetProps {
  employeeId: string;
  employeeName?: string;
}

export function PunchWidget({ employeeId, employeeName }: PunchWidgetProps) {
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [workingTime, setWorkingTime] = useState<string>('0:00:00');
  const [breakTime, setBreakTime] = useState<string>('0:00');

  // Load today's attendance
  useEffect(() => {
    loadTodayAttendance();
    const interval = setInterval(loadTodayAttendance, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [employeeId]);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate working time
  useEffect(() => {
    if (attendance?.checkIn && !attendance?.checkOut) {
      const interval = setInterval(() => {
        const checkInTime = new Date(attendance.checkIn!);
        const now = new Date();
        const diffMs = now.getTime() - checkInTime.getTime();
        const breakMs = (attendance.breakDuration || 0) * 60 * 1000;
        const workMs = diffMs - breakMs;
        
        const hours = Math.floor(workMs / (1000 * 60 * 60));
        const minutes = Math.floor((workMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((workMs % (1000 * 60)) / 1000);
        
        setWorkingTime(`${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
      }, 1000);
      return () => clearInterval(interval);
    } else if (attendance?.totalHours) {
      const hours = Math.floor(attendance.totalHours);
      const minutes = Math.floor((attendance.totalHours % 1) * 60);
      setWorkingTime(`${hours}:${String(minutes).padStart(2, '0')}:00`);
    } else {
      setWorkingTime('0:00:00');
    }
  }, [attendance]);

  // Calculate break time
  useEffect(() => {
    if (attendance?.breakStart && !attendance?.breakEnd) {
      const interval = setInterval(() => {
        const breakStartTime = new Date(attendance.breakStart!);
        const now = new Date();
        const diffMs = now.getTime() - breakStartTime.getTime();
        const minutes = Math.floor(diffMs / (1000 * 60));
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
        
        setBreakTime(`${minutes}:${String(seconds).padStart(2, '0')}`);
      }, 1000);
      return () => clearInterval(interval);
    } else if (attendance?.breakDuration) {
      const minutes = attendance.breakDuration;
      setBreakTime(`${minutes}:00`);
    } else {
      setBreakTime('0:00');
    }
  }, [attendance]);

  const loadTodayAttendance = async () => {
    try {
      const data = await apiService.getTodayAttendance(employeeId);
      setAttendance(data);
    } catch (err) {
      console.error('Failed to load attendance:', err);
    }
  };

  const handlePunchIn = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await apiService.punchIn(employeeId);
      if (response.success) {
        setSuccess(response.message);
        setAttendance(response.attendance);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.message);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to punch in');
    } finally {
      setLoading(false);
    }
  };

  const handlePunchOut = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await apiService.punchOut(employeeId);
      setSuccess(
        `${response.message}. Total hours: ${response.totalHours}h` +
        (response.isOvertime ? ` (${response.overtimeHours}h overtime)` : '')
      );
      setAttendance(response.attendance);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to punch out');
    } finally {
      setLoading(false);
    }
  };

  const handleStartBreak = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await apiService.startBreak(employeeId);
      setSuccess(response.message);
      setAttendance(response.attendance);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to start break');
    } finally {
      setLoading(false);
    }
  };

  const handleEndBreak = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await apiService.endBreak(employeeId);
      setSuccess(response.message);
      setAttendance(response.attendance);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to end break');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (!attendance) return null;
    
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string; icon: any }> = {
      'present': { variant: 'default' as const, label: 'Present', icon: CheckCircle2 },
      'late': { variant: 'secondary' as const, label: 'Late Arrival', icon: AlertCircle },
      'on-break': { variant: 'outline' as const, label: 'On Break', icon: Coffee },
      'half-day': { variant: 'outline' as const, label: 'Half Day', icon: Clock },
      'absent': { variant: 'destructive' as const, label: 'Absent', icon: AlertCircle },
    };
    
    const config = statusConfig[attendance.status] || statusConfig.absent;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const canPunchIn = !attendance?.checkIn;
  const canPunchOut = attendance?.checkIn && !attendance?.checkOut && attendance?.status !== 'on-break';
  const canStartBreak = attendance?.checkIn && !attendance?.checkOut && attendance?.status !== 'on-break' && (!attendance?.breakStart || attendance?.breakEnd);
  const canEndBreak = attendance?.status === 'on-break' && attendance?.breakStart && !attendance?.breakEnd;
  const isPunchedOut = attendance?.checkOut != null;

  const excessBreakMinutes = Math.max(0, (attendance?.breakDuration || 0) - 60);
  const breakDeduction = excessBreakMinutes > 0 ? (excessBreakMinutes * 0.5).toFixed(2) : '0.00';

  return (
    <div className="space-y-4">
      {/* Main Punch Card */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Attendance Tracker</CardTitle>
              <CardDescription>
                {format(currentTime, 'EEEE, MMMM d, yyyy')}
              </CardDescription>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Time */}
          <div className="text-center py-4">
            <div className="text-5xl font-bold font-mono">
              {format(currentTime, 'HH:mm:ss')}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Current Time
            </div>
          </div>

          {/* Working Hours Display */}
          {attendance?.checkIn && (
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <Timer className="h-5 w-5 mx-auto mb-2 text-blue-600" />
                <div className="text-2xl font-bold font-mono">{workingTime}</div>
                <div className="text-xs text-muted-foreground">Work Hours</div>
              </div>
              
              <div className="text-center p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                <Coffee className="h-5 w-5 mx-auto mb-2 text-orange-600" />
                <div className="text-2xl font-bold font-mono">{breakTime}</div>
                <div className="text-xs text-muted-foreground">Break Time</div>
              </div>
            </div>
          )}

          {/* Alerts */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-300">
                {success}
              </AlertDescription>
            </Alert>
          )}

          {/* Warnings */}
          {attendance?.isLate && !isPunchedOut && (
            <Alert variant="default" className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800 dark:text-yellow-300">
                Late arrival detected. Standard start time is 10:00 AM.
              </AlertDescription>
            </Alert>
          )}

          {excessBreakMinutes > 0 && !isPunchedOut && (
            <Alert variant="default" className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800 dark:text-orange-300">
                Break time exceeded by {excessBreakMinutes} minutes. Deduction: ₹{breakDeduction}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            {canPunchIn && (
              <Button 
                onClick={handlePunchIn} 
                disabled={loading}
                className="h-16 text-lg"
                size="lg"
              >
                <LogIn className="h-5 w-5 mr-2" />
                Punch In
              </Button>
            )}

            {canStartBreak && (
              <Button 
                onClick={handleStartBreak} 
                disabled={loading}
                variant="outline"
                className="h-16"
              >
                <Coffee className="h-5 w-5 mr-2" />
                Start Break
              </Button>
            )}

            {canEndBreak && (
              <Button 
                onClick={handleEndBreak} 
                disabled={loading}
                variant="default"
                className="h-16 col-span-2"
              >
                <Coffee className="h-5 w-5 mr-2" />
                End Break
              </Button>
            )}

            {canPunchOut && (
              <Button 
                onClick={handlePunchOut} 
                disabled={loading}
                className="h-16 text-lg col-span-2"
                size="lg"
              >
                <LogOut className="h-5 w-5 mr-2" />
                Punch Out
              </Button>
            )}
          </div>

          {/* Summary after punch out */}
          {isPunchedOut && (
            <div className="pt-4 border-t space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Check In:</span>
                <span className="font-medium">{attendance.checkIn ? format(new Date(attendance.checkIn), 'HH:mm:ss') : '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Check Out:</span>
                <span className="font-medium">{attendance.checkOut ? format(new Date(attendance.checkOut), 'HH:mm:ss') : '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Hours:</span>
                <span className="font-bold">{attendance.totalHours?.toFixed(2)}h</span>
              </div>
              {attendance.isOvertime && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Overtime:</span>
                  <span className="font-bold text-green-600">+{attendance.overtimeHours?.toFixed(2)}h</span>
                </div>
              )}
              {attendance.breakDeduction && attendance.breakDeduction > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Break Deduction:</span>
                  <span className="font-bold text-red-600">-₹{attendance.breakDeduction.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Time Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Shift Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shift Timing:</span>
            <span className="font-medium">10:00 AM - 7:00 PM</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Standard Break:</span>
            <span className="font-medium">60 minutes</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Overtime After:</span>
            <span className="font-medium">7:00 PM</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Break Deduction:</span>
            <span className="font-medium">₹0.5/min (after 60 min)</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
