-- Migration: Switch to Flexible 9-Hour Shift System
-- Date: 2026-03-11
-- Description: Remove fixed 10-7 schedule, implement flexible 9-hour shift with deductions

-- ============= UPDATE ATTENDANCE SETTINGS =============

-- Update shift settings for flexible 9-hour system
UPDATE attendance_settings 
SET setting_value = 'flexible', description = 'Flexible shift - employees can start anytime'
WHERE setting_key = 'shift_start_time';

UPDATE attendance_settings
SET setting_value = '9', description = 'Required work hours per day (excluding breaks)'
WHERE setting_key = 'full_day_hours';

-- Add new setting for undertime deduction rate
INSERT INTO attendance_settings (setting_key, setting_value, description) VALUES
  ('undertime_deduction_per_hour', '100', 'Money deducted per hour short of required hours (₹100/hour)')
ON CONFLICT (setting_key) DO UPDATE 
SET setting_value = '100', 
    description = 'Money deducted per hour short of required hours (₹100/hour)';

-- Remove late threshold since no fixed start time
UPDATE attendance_settings
SET setting_value = 'disabled', description = 'Late marking disabled in flexible shift system'
WHERE setting_key = 'late_threshold_minutes';

-- Remove fixed overtime start time
UPDATE attendance_settings
SET setting_value = 'flexible', description = 'Overtime = hours worked beyond 9 hours'
WHERE setting_key = 'overtime_start_time';

-- ============= ADD NOTES COLUMN (if not exists) =============

-- For storing deduction details and notes
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendance' AND column_name = 'notes'
    ) THEN
        ALTER TABLE attendance ADD COLUMN notes text;
    END IF;
END $$;

-- ============= COMMENTS =============

COMMENT ON COLUMN attendance.break_deduction IS 'Total deduction: undertime + excess break (₹100/hour undertime + ₹0.5/min excess break)';
COMMENT ON COLUMN attendance.is_late IS 'Always false in flexible shift system';
COMMENT ON COLUMN attendance.is_overtime IS 'True if total_hours > 9';
COMMENT ON COLUMN attendance.overtime_hours IS 'Hours worked beyond 9-hour requirement';
COMMENT ON COLUMN attendance.notes IS 'Deduction details and other notes';
