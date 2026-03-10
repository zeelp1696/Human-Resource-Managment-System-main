-- ============================================================
-- FIX: Row Level Security policies for HRMS tables
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- ---- employees ----
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to employees" ON public.employees;
CREATE POLICY "Allow full access to employees" ON public.employees
  FOR ALL USING (true) WITH CHECK (true);

-- ---- tasks ----
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to tasks" ON public.tasks;
CREATE POLICY "Allow full access to tasks" ON public.tasks
  FOR ALL USING (true) WITH CHECK (true);

-- ---- skills ----
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to skills" ON public.skills;
CREATE POLICY "Allow full access to skills" ON public.skills
  FOR ALL USING (true) WITH CHECK (true);

-- ---- task_required_skills ----
ALTER TABLE public.task_required_skills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to task_required_skills" ON public.task_required_skills;
CREATE POLICY "Allow full access to task_required_skills" ON public.task_required_skills
  FOR ALL USING (true) WITH CHECK (true);

-- ---- employee_skills ----
ALTER TABLE public.employee_skills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to employee_skills" ON public.employee_skills;
CREATE POLICY "Allow full access to employee_skills" ON public.employee_skills
  FOR ALL USING (true) WITH CHECK (true);

-- ---- leave_requests ----
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to leave_requests" ON public.leave_requests;
CREATE POLICY "Allow full access to leave_requests" ON public.leave_requests
  FOR ALL USING (true) WITH CHECK (true);

-- ---- attendance ----
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to attendance" ON public.attendance;
CREATE POLICY "Allow full access to attendance" ON public.attendance
  FOR ALL USING (true) WITH CHECK (true);

-- NOTE: 'reports' table does not exist in this project — skipped.

-- ============================================================
-- Also disable email confirmation (run in Supabase Dashboard
-- Auth → Settings → uncheck "Enable email confirmations")
-- This lets newly created Supabase Auth accounts log in right
-- away without verifying email.
-- ============================================================
