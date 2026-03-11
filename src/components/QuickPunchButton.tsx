import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { LogIn, LogOut, Coffee, Loader2 } from 'lucide-react';
import { apiService, type Attendance } from '../utils/api';

interface QuickPunchButtonProps {
  employeeId: string;
}

export function QuickPunchButton({ employeeId }: QuickPunchButtonProps) {
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('not-started');

  useEffect(() => {
    loadTodayAttendance();
    const interval = setInterval(loadTodayAttendance, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [employeeId]);

  const loadTodayAttendance = async () => {
    try {
      const data = await apiService.getTodayAttendance(employeeId);
      setAttendance(data);
      
      // Determine current status
      if (!data) {
        setStatus('not-started');
      } else if (data.checkOut) {
        setStatus('completed');
      } else if (data.status === 'on-break') {
        setStatus('on-break');
      } else if (data.checkIn) {
        setStatus('working');
      } else {
        setStatus('not-started');
      }
    } catch (err) {
      console.error('Failed to load attendance:', err);
    }
  };

  const handlePunchIn = async () => {
    setLoading(true);
    try {
      await apiService.punchIn(employeeId);
      await loadTodayAttendance();
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePunchOut = async () => {
    setLoading(true);
    try {
      await apiService.punchOut(employeeId);
      await loadTodayAttendance();
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartBreak = async () => {
    setLoading(true);
    try {
      await apiService.startBreak(employeeId);
      await loadTodayAttendance();
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEndBreak = async () => {
    setLoading(true);
    try {
      await apiService.endBreak(employeeId);
      await loadTodayAttendance();
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getButtonConfig = () => {
    switch (status) {
      case 'not-started':
        return {
          label: 'Punch In',
          icon: LogIn,
          onClick: handlePunchIn,
          variant: 'default' as const,
        };
      case 'working':
        return {
          label: 'Punch Out',
          icon: LogOut,
          onClick: handlePunchOut,
          variant: 'destructive' as const,
        };
      case 'on-break':
        return {
          label: 'End Break',
          icon: Coffee,
          onClick: handleEndBreak,
          variant: 'default' as const,
        };
      case 'completed':
        return {
          label: 'Shift Completed',
          icon: LogOut,
          onClick: () => {},
          variant: 'outline' as const,
          disabled: true,
        };
      default:
        return {
          label: 'Punch In',
          icon: LogIn,
          onClick: handlePunchIn,
          variant: 'default' as const,
        };
    }
  };

  const buttonConfig = getButtonConfig();
  const Icon = buttonConfig.icon;

  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={buttonConfig.onClick}
        disabled={loading || buttonConfig.disabled}
        variant={buttonConfig.variant}
        size="lg"
        className="min-w-[140px]"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Icon className="h-4 w-4 mr-2" />
        )}
        {buttonConfig.label}
      </Button>

      {status === 'working' && !loading && (
        <Button
          onClick={handleStartBreak}
          variant="outline"
          size="lg"
        >
          <Coffee className="h-4 w-4 mr-2" />
          Start Break
        </Button>
      )}

      {attendance?.isLate && status !== 'completed' && (
        <Badge variant="destructive">Late Arrival</Badge>
      )}
      
      {attendance?.isOvertime && (
        <Badge variant="secondary">Overtime</Badge>
      )}
    </div>
  );
}
