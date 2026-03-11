-- Migration: Fix Attendance Field Precision
-- Date: 2026-03-11
-- Description: Increase precision for total_hours, overtime_hours, and break_deduction to prevent overflow errors

-- Update total_hours from decimal(4,2) to decimal(6,2) - allows up to 9999.99 hours
ALTER TABLE attendance
  ALTER COLUMN total_hours TYPE decimal(6,2);

-- Update overtime_hours from decimal(4,2) to decimal(6,2)
ALTER TABLE attendance
  ALTER COLUMN overtime_hours TYPE decimal(6,2);

-- Update break_deduction from decimal(4,2) to decimal(6,2)
ALTER TABLE attendance
  ALTER COLUMN break_deduction TYPE decimal(6,2);

-- Add comment for documentation
COMMENT ON COLUMN attendance.total_hours IS 'Total work hours (excluding breaks). Precision: 6,2 allows up to 9999.99 hours';
COMMENT ON COLUMN attendance.overtime_hours IS 'Overtime hours (after 7 PM). Precision: 6,2 allows up to 9999.99 hours';
COMMENT ON COLUMN attendance.break_deduction IS 'Money deducted for excess break (₹0.5/min). Precision: 6,2 allows up to ₹9999.99';
