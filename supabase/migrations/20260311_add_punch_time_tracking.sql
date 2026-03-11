-- Migration: Add Punch In/Punch Out Time Tracking
-- Date: 2026-03-11
-- Description: Adds check-in/check-out times, break tracking, late/overtime detection

-- ============= UPDATE ATTENDANCE TABLE =============

-- Add new columns for time tracking
ALTER TABLE attendance 
  DROP CONSTRAINT IF EXISTS attendance_status_check;

ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS check_in timestamp,
  ADD COLUMN IF NOT EXISTS check_out timestamp,
  ADD COLUMN IF NOT EXISTS break_start timestamp,
  ADD COLUMN IF NOT EXISTS break_end timestamp,
  ADD COLUMN IF NOT EXISTS break_duration int DEFAULT 0, -- in minutes
  ADD COLUMN IF NOT EXISTS total_hours decimal(4,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_late boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_overtime boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS overtime_hours decimal(4,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS break_deduction decimal(4,2) DEFAULT 0, -- money deducted for excess break
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now();

-- Update status constraint to include new statuses
ALTER TABLE attendance
  ADD CONSTRAINT attendance_status_check 
  CHECK (status IN ('present', 'absent', 'leave', 'late', 'half-day', 'on-break'));

-- ============= CREATE ATTENDANCE LOGS TABLE =============
-- Track all punch in/out/break events for audit trail

CREATE TABLE IF NOT EXISTS attendance_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  attendance_id uuid REFERENCES attendance(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('check-in', 'check-out', 'break-start', 'break-end')),
  event_time timestamp NOT NULL DEFAULT now(),
  location text, -- GPS coordinates or location name
  ip_address text,
  device_info text,
  created_at timestamp DEFAULT now()
);

-- ============= CREATE ATTENDANCE SETTINGS TABLE =============
-- Company-wide attendance rules

CREATE TABLE IF NOT EXISTS attendance_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key text UNIQUE NOT NULL,
  setting_value text NOT NULL,
  description text,
  updated_at timestamp DEFAULT now()
);

-- Insert default settings
INSERT INTO attendance_settings (setting_key, setting_value, description) VALUES
  ('shift_start_time', '10:00', 'Official shift start time (HH:MM)'),
  ('shift_end_time', '19:00', 'Official shift end time (HH:MM) - 7:00 PM'),
  ('late_threshold_minutes', '0', 'Grace period before marking late (0 = strict 10:00 AM)'),
  ('standard_break_minutes', '60', 'Standard break duration (1 hour)'),
  ('break_deduction_per_minute', '0.5', 'Money deducted per minute of excess break'),
  ('overtime_start_time', '19:00', 'When overtime begins (7:00 PM)'),
  ('half_day_hours', '4', 'Minimum hours for half day'),
  ('full_day_hours', '9', 'Expected hours for full day (10 AM - 7 PM = 9 hours)'),
  ('enable_gps_tracking', 'false', 'Enable GPS location tracking for punch in/out')
ON CONFLICT (setting_key) DO NOTHING;

-- ============= CREATE FUNCTIONS =============

-- Function to calculate work hours
CREATE OR REPLACE FUNCTION calculate_work_hours(
  p_check_in timestamp,
  p_check_out timestamp,
  p_break_duration int
) RETURNS decimal AS $$
DECLARE
  total_minutes int;
  work_hours decimal;
BEGIN
  IF p_check_in IS NULL OR p_check_out IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Calculate total minutes worked
  total_minutes := EXTRACT(EPOCH FROM (p_check_out - p_check_in)) / 60;
  
  -- Subtract break duration
  total_minutes := total_minutes - COALESCE(p_break_duration, 0);
  
  -- Convert to hours (rounded to 2 decimals)
  work_hours := ROUND((total_minutes::decimal / 60), 2);
  
  RETURN GREATEST(work_hours, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to detect if check-in is late
CREATE OR REPLACE FUNCTION is_check_in_late(
  p_check_in timestamp,
  p_date date
) RETURNS boolean AS $$
DECLARE
  shift_start time;
  check_in_time time;
  late_threshold int;
BEGIN
  -- Get shift start time and late threshold from settings
  SELECT setting_value::time INTO shift_start 
  FROM attendance_settings WHERE setting_key = 'shift_start_time';
  
  SELECT setting_value::int INTO late_threshold 
  FROM attendance_settings WHERE setting_key = 'late_threshold_minutes';
  
  -- Extract time from check_in timestamp
  check_in_time := p_check_in::time;
  
  -- Check if late (check_in_time > shift_start + threshold)
  RETURN check_in_time > (shift_start + (late_threshold || ' minutes')::interval);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate overtime hours
CREATE OR REPLACE FUNCTION calculate_overtime_hours(
  p_check_out timestamp
) RETURNS decimal AS $$
DECLARE
  overtime_start time;
  check_out_time time;
  overtime_minutes int;
BEGIN
  IF p_check_out IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Get overtime start time from settings
  SELECT setting_value::time INTO overtime_start 
  FROM attendance_settings WHERE setting_key = 'overtime_start_time';
  
  -- Extract time from check_out timestamp
  check_out_time := p_check_out::time;
  
  -- Calculate overtime if checked out after 7 PM
  IF check_out_time > overtime_start THEN
    overtime_minutes := EXTRACT(EPOCH FROM (check_out_time - overtime_start)) / 60;
    RETURN ROUND((overtime_minutes::decimal / 60), 2);
  END IF;
  
  RETURN 0;
END;
$$ LANGUAGE plpgsql;

-- ============= CREATE INDEXES =============
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_attendance ON attendance_logs(attendance_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_employee ON attendance_logs(employee_id);

-- ============= UPDATE EXISTING ATTENDANCE RECORDS =============
-- Mark existing records as legacy data (no check-in/check-out times)
UPDATE attendance 
SET notes = 'Legacy data - migrated from old system'
WHERE check_in IS NULL AND created_at < now();

COMMENT ON TABLE attendance IS 'Employee attendance records with punch in/out tracking';
COMMENT ON TABLE attendance_logs IS 'Audit trail for all punch in/out/break events';
COMMENT ON TABLE attendance_settings IS 'Company-wide attendance rules and settings';
