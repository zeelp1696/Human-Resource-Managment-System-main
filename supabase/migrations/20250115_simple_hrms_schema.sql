-- Enable UUID
create extension if not exists "uuid-ossp";

-- ============= EMPLOYEES =============
drop table if exists employee_skills cascade;
drop table if exists employees cascade;

create table employees (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text not null unique,
  role text default 'employee' check (role in ('employee','hr','manager','admin')),
  position text,
  department text,
  phone text,
  experience int default 0,
  salary numeric default 0,
  availability int default 100,  -- percentage (0–100)
  currentTasks int default 0,
  joinDate date default current_date,
  created_at timestamp default now()
);

-- ============= SKILLS =============
drop table if exists skills cascade;

create table skills (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text not null
);

-- Employee ↔ Skills junction (with level)
create table employee_skills (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid references employees(id) on delete cascade,
  skill_id uuid references skills(id) on delete cascade,
  level int not null check (level between 1 and 5)
);

-- ============= TASKS =============
drop table if exists task_required_skills cascade;
drop table if exists tasks cascade;

create table tasks (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  status text default 'pending' check (status in ('pending','assigned','in-progress','completed')),
  priority text default 'medium' check (priority in ('low','medium','high','urgent')),
  estimatedHours int default 0,
  progress int default 0,
  due_date date,
  assigned_to uuid references employees(id) on delete set null,
  created_at timestamp default now()
);

-- Required skills for a task
create table task_required_skills (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid references tasks(id) on delete cascade,
  skill_id uuid references skills(id) on delete cascade,
  level int not null check (level between 1 and 5),
  importance text default 'preferred' check (importance in ('required','preferred'))
);

-- ============= ATTENDANCE =============
drop table if exists attendance cascade;

create table attendance (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid references employees(id) on delete cascade,
  date date not null,
  status text not null check (status in ('present','absent','leave')),
  created_at timestamp default now()
);

-- ============= LEAVE REQUESTS =============
drop table if exists leave_requests cascade;

create table leave_requests (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid references employees(id) on delete cascade,
  type text not null check (type in ('sick','vacation','personal','emergency')),
  start_date date not null,
  end_date date not null,
  reason text not null,
  status text not null check (status in ('pending','approved','rejected')) default 'pending',
  reviewed_by text, -- HR reviewer name/role
  reviewed_at timestamp, -- when reviewed
  created_at timestamp default now()
);

-- =========================================
-- SAMPLE DATA
-- =========================================

-- SKILLS (master list)
insert into skills (name, category) values
('Management', 'Soft Skill'),
('HTML', 'Technical'),
('Design', 'Creative'),
('JavaScript', 'Technical'),
('Communication', 'Soft Skill');

-- EMPLOYEES
insert into employees (name, email, department, role, availability, position, phone, experience, salary, currentTasks)
values
('Preyansh Patel', 'alice@example.com', 'HR', 'hr', 100, 'HR Manager', '9876543210', 5, 60000, 1),
('Tanay Vakharia', 'bob@example.com', 'Engineering', 'employee', 100, 'Frontend Dev', '9876500001', 2, 45000, 1),
('Riddhi Rawal', 'charlie@example.com', 'Operations', 'employee', 100, 'Designer', '9876500002', 3, 40000, 1);

-- EMPLOYEE SKILLS
insert into employee_skills (employee_id, skill_id, level) values
((select id from employees where email = 'alice@example.com'), (select id from skills where name='Management'), 5),
((select id from employees where email = 'bob@example.com'), (select id from skills where name='HTML'), 4),
((select id from employees where email = 'bob@example.com'), (select id from skills where name='JavaScript'), 3),
((select id from employees where email = 'charlie@example.com'), (select id from skills where name='Design'), 5),
((select id from employees where email = 'charlie@example.com'), (select id from skills where name='Communication'), 4);

-- TASKS
insert into tasks (title, description, assigned_to, status, priority, estimatedHours, progress, due_date)
values
('Prepare Monthly Report', 'HR report for management', (select id from employees where email='alice@example.com'), 'in-progress', 'high', 10, 40, current_date + interval '7 day'),
('Fix API Bug', 'Resolve login API issue', (select id from employees where email='bob@example.com'), 'pending', 'medium', 8, 0, current_date + interval '3 day'),
('Schedule Maintenance', 'Server downtime notice', (select id from employees where email='charlie@example.com'), 'completed', 'low', 5, 100, current_date - interval '1 day');

-- TASK REQUIRED SKILLS
insert into task_required_skills (task_id, skill_id, level, importance) values
((select id from tasks where title='Prepare Monthly Report'), (select id from skills where name='Management'), 4, 'required'),
((select id from tasks where title='Fix API Bug'), (select id from skills where name='JavaScript'), 3, 'required'),
((select id from tasks where title='Fix API Bug'), (select id from skills where name='HTML'), 3, 'preferred'),
((select id from tasks where title='Schedule Maintenance'), (select id from skills where name='Communication'), 3, 'preferred');

-- ATTENDANCE
insert into attendance (employee_id, date, status) values
((select id from employees where name = 'Preyansh Patel'), current_date, 'present'),
((select id from employees where name = 'Tanay Vakharia'), current_date, 'absent'),
((select id from employees where name = 'Riddhi Rawal'), current_date, 'leave');

-- LEAVE REQUESTS
insert into leave_requests (employee_id, type, start_date, end_date, reason, status)
values
((select id from employees where name = 'Tanay Vakharia'), 'sick', '2025-09-20', '2025-09-22', 'Medical leave', 'pending'),
((select id from employees where name = 'Riddhi Rawal'), 'personal', '2025-09-25', '2025-09-27', 'Family event', 'approved');

-- =========================================
-- DASHBOARD VIEW
-- =========================================
drop view if exists v_dashboard_kpis cascade;

create view v_dashboard_kpis as
select
  (select count(*) from employees) as total_employees,
  (select count(*) from employees where availability > 0) as active_employees,
  (select count(*) from tasks) as total_tasks,
  (select count(*) from tasks where status in ('pending','assigned','in-progress')) as pending_tasks,
  (select count(*) from tasks where status = 'completed') as completed_tasks,
  (select count(*) from attendance where date = current_date and status = 'present') as present_today,
  (select count(*) from leave_requests where status = 'pending') as pending_leaves,
  (select count(distinct department) from employees where department is not null) as departments;

