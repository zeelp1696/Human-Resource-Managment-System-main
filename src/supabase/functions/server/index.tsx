import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Remove Supabase client initialization to avoid auth issues

// Enable CORS first - this is critical
app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: false,
  }),
);

// Enable logger
app.use('*', logger(console.log));

// Request debugging middleware
app.use('*', async (c, next) => {
  console.log(`${c.req.method} ${c.req.url}`);
  console.log('Headers:', Object.fromEntries(c.req.raw.headers.entries()));
  
  await next();
  console.log(`Response status: ${c.res.status}`);
});

// In-memory storage to avoid KV/Supabase auth issues
const inMemoryStore: Record<string, any> = {};

// Initialize mock data in memory
function initializeMockData() {
  console.log('Initializing mock data in memory...');
  
  // Always ensure users exist
  const users = [
    { id: '1', email: 'hr@company.com', name: 'HR Manager', role: 'hr', department: 'Human Resources', position: 'HR Manager' },
    { id: '2', email: 'employee@company.com', name: 'John Doe', role: 'employee', department: 'Engineering', position: 'Software Engineer' }
  ];
  
  inMemoryStore['users'] = users;
  console.log('Users initialized:', users);
  
  if (!inMemoryStore['employees']) {
    // Initialize employees
    const mockEmployees = [
      {
        id: '1',
        name: 'Sarah Johnson',
        email: 'sarah.johnson@company.com',
        department: 'Engineering',
        position: 'Senior Frontend Developer',
        skills: [
          { name: 'React', level: 5, category: 'Frontend' },
          { name: 'TypeScript', level: 4, category: 'Programming' },
          { name: 'UI/UX Design', level: 3, category: 'Design' },
          { name: 'Node.js', level: 3, category: 'Backend' },
        ],
        experience: 6,
        availability: 80,
        currentTasks: 3,
        joinDate: '2021-03-15',
        phone: '+1-555-0123',
        address: '123 Tech Street, San Francisco, CA',
      },
      {
        id: '2',
        name: 'Michael Chen',
        email: 'michael.chen@company.com',
        department: 'Engineering',
        position: 'Backend Developer',
        skills: [
          { name: 'Python', level: 5, category: 'Programming' },
          { name: 'Django', level: 4, category: 'Backend' },
          { name: 'PostgreSQL', level: 4, category: 'Database' },
          { name: 'Docker', level: 3, category: 'DevOps' },
          { name: 'AWS', level: 3, category: 'Cloud' },
        ],
        experience: 4,
        availability: 90,
        currentTasks: 2,
        joinDate: '2022-01-10',
        phone: '+1-555-0124',
        address: '456 Code Ave, San Francisco, CA',
      },
      {
        id: '3',
        name: 'Emily Rodriguez',
        email: 'emily.rodriguez@company.com',
        department: 'Design',
        position: 'UX Designer',
        skills: [
          { name: 'UI/UX Design', level: 5, category: 'Design' },
          { name: 'Figma', level: 5, category: 'Design Tools' },
          { name: 'User Research', level: 4, category: 'Research' },
          { name: 'Prototyping', level: 4, category: 'Design' },
          { name: 'HTML/CSS', level: 3, category: 'Frontend' },
        ],
        experience: 5,
        availability: 85,
        currentTasks: 1,
        joinDate: '2021-07-20',
        phone: '+1-555-0125',
        address: '789 Design Blvd, San Francisco, CA',
      },
      {
        id: '4',
        name: 'David Kim',
        email: 'david.kim@company.com',
        department: 'Engineering',
        position: 'DevOps Engineer',
        skills: [
          { name: 'Docker', level: 5, category: 'DevOps' },
          { name: 'Kubernetes', level: 4, category: 'DevOps' },
          { name: 'AWS', level: 5, category: 'Cloud' },
          { name: 'Terraform', level: 4, category: 'Infrastructure' },
          { name: 'Python', level: 3, category: 'Programming' },
        ],
        experience: 7,
        availability: 75,
        currentTasks: 4,
        joinDate: '2020-11-05',
        phone: '+1-555-0126',
        address: '321 Cloud Street, San Francisco, CA',
      },
      {
        id: '5',
        name: 'Lisa Wang',
        email: 'lisa.wang@company.com',
        department: 'Marketing',
        position: 'Marketing Manager',
        skills: [
          { name: 'Digital Marketing', level: 5, category: 'Marketing' },
          { name: 'Content Strategy', level: 4, category: 'Marketing' },
          { name: 'SEO', level: 4, category: 'Marketing' },
          { name: 'Google Analytics', level: 4, category: 'Analytics' },
          { name: 'Social Media', level: 5, category: 'Marketing' },
        ],
        experience: 8,
        availability: 95,
        currentTasks: 2,
        joinDate: '2019-09-12',
        phone: '+1-555-0127',
        address: '654 Marketing Lane, San Francisco, CA',
      },
    ];

    const mockTasks = [
      {
        id: '1',
        title: 'Redesign User Dashboard',
        description: 'Complete redesign of the main user dashboard with improved UX and modern design patterns',
        requiredSkills: [
          { name: 'UI/UX Design', level: 4, importance: 'required' },
          { name: 'Figma', level: 3, importance: 'required' },
          { name: 'User Research', level: 3, importance: 'preferred' },
          { name: 'React', level: 3, importance: 'nice-to-have' },
        ],
        priority: 'high',
        status: 'pending',
        estimatedHours: 40,
        due_date: '2024-02-15',
        createdBy: 'John Doe',
        createdAt: '2024-01-15',
        progress: 0,
      },
      {
        id: '2',
        title: 'API Performance Optimization',
        description: 'Optimize database queries and improve API response times by at least 30%',
        requiredSkills: [
          { name: 'Python', level: 4, importance: 'required' },
          { name: 'Django', level: 3, importance: 'required' },
          { name: 'PostgreSQL', level: 4, importance: 'required' },
          { name: 'AWS', level: 2, importance: 'preferred' },
        ],
        priority: 'medium',
        status: 'assigned',
        assigned_to: '2',
        estimatedHours: 32,
        due_date: '2024-02-20',
        createdBy: 'John Doe',
        createdAt: '2024-01-10',
        progress: 25,
      },
      {
        id: '3',
        title: 'Implement CI/CD Pipeline',
        description: 'Set up automated CI/CD pipeline for faster and more reliable deployments',
        requiredSkills: [
          { name: 'Docker', level: 4, importance: 'required' },
          { name: 'Kubernetes', level: 3, importance: 'required' },
          { name: 'AWS', level: 4, importance: 'required' },
          { name: 'Terraform', level: 3, importance: 'preferred' },
        ],
        priority: 'high',
        status: 'in-progress',
        assigned_to: '4',
        estimatedHours: 48,
        due_date: '2024-02-25',
        createdBy: 'John Doe',
        createdAt: '2024-01-08',
        progress: 60,
      },
      {
        id: '4',
        title: 'Mobile App Frontend',
        description: 'Develop responsive mobile frontend for the customer portal',
        requiredSkills: [
          { name: 'React', level: 4, importance: 'required' },
          { name: 'TypeScript', level: 3, importance: 'required' },
          { name: 'UI/UX Design', level: 2, importance: 'preferred' },
        ],
        priority: 'medium',
        status: 'pending',
        estimatedHours: 80,
        due_date: '2024-03-10',
        createdBy: 'John Doe',
        createdAt: '2024-01-12',
        progress: 0,
      },
    ];

    const mockAttendance = [
      {
        id: '1',
        employeeId: '1',
        date: '2024-01-15',
        checkIn: '09:00',
        checkOut: '17:30',
        status: 'present',
        hours: 8.5,
      },
      {
        id: '2',
        employeeId: '2',
        date: '2024-01-15',
        checkIn: '09:15',
        checkOut: '18:00',
        status: 'late',
        hours: 8.75,
      },
      {
        id: '3',
        employeeId: '3',
        date: '2024-01-15',
        checkIn: '08:45',
        checkOut: '17:15',
        status: 'present',
        hours: 8.5,
      },
    ];

    const mockLeaveRequests = [
      {
        id: '1',
        employeeId: '1',
        type: 'vacation',
        startDate: '2024-02-10',
        endDate: '2024-02-14',
        days: 5,
        reason: 'Family vacation',
        status: 'pending',
        appliedAt: '2024-01-15',
      },
      {
        id: '2',
        employeeId: '3',
        type: 'sick',
        startDate: '2024-01-20',
        endDate: '2024-01-20',
        days: 1,
        reason: 'Medical appointment',
        status: 'approved',
        appliedAt: '2024-01-18',
        reviewedBy: 'HR Manager',
        reviewedAt: '2024-01-19',
      },
    ];

    inMemoryStore['employees'] = mockEmployees;
    inMemoryStore['tasks'] = mockTasks;
    inMemoryStore['attendance'] = mockAttendance;
    inMemoryStore['leaveRequests'] = mockLeaveRequests;
    
    console.log('Mock data initialized in memory');
  } else {
    console.log('Mock data already exists in memory');
  }
  
  console.log('Verification - stored users:', inMemoryStore['users']);
}

// Demo mode - no authentication required (removed function as not needed)

// Public routes
app.get("/make-server-e04b5d68/health", (c) => {
  try {
    initializeMockData(); // Ensure data exists
    const users = inMemoryStore['users'];
    const employees = inMemoryStore['employees'];
    return c.json({ 
      status: "ok", 
      data: {
        usersCount: users ? users.length : 0,
        employeesCount: employees ? employees.length : 0,
        initialized: !!(users && employees)
      }
    });
  } catch (error) {
    return c.json({ status: "error", error: error.message }, 500);
  }
});

// Auth endpoints
app.post("/make-server-e04b5d68/auth/login", async (c) => {
  try {
    const { email, password } = await c.req.json();
    console.log('Login attempt for email:', email);
    
    // Initialize data and get users from memory
    initializeMockData();
    const users = inMemoryStore['users'] || [];
    
    console.log('Available users:', users.map((u: any) => u.email));
    
    const user = users.find((u: any) => u.email === email);
    console.log('User found:', user ? 'yes' : 'no');
    
    if (!user) {
      console.log('User not found for email:', email);
      console.log('Available emails:', users.map((u: any) => u.email));
      return c.json({ error: 'User not found' }, 404);
    }
    
    // In production, check password hash
    if (password === 'password123') {
      console.log('Login successful for user:', user.name);
      return c.json({ user, token: 'demo-token-' + user.id });
    } else {
      console.log('Invalid password for user:', email);
      return c.json({ error: 'Invalid credentials' }, 401);
    }
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Login failed: ' + error.message }, 500);
  }
});

// Debug endpoint to check users
app.get("/make-server-e04b5d68/debug/users", (c) => {
  try {
    initializeMockData();
    const users = inMemoryStore['users'];
    
    return c.json({ 
      storedUsers: users || [],
      memoryWorking: true,
      allKeys: Object.keys(inMemoryStore)
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// Simple test endpoint
app.get("/make-server-e04b5d68/test", (c) => {
  return c.json({ 
    message: 'Server is working!',
    timestamp: new Date().toISOString(),
    demoUsers: [
      'hr@company.com',
      'employee@company.com'
    ]
  });
});

// Alternative endpoints with no auth whatsoever
app.get("/make-server-e04b5d68/api/employees", (c) => {
  console.log('Alternative employees endpoint called');
  try {
    initializeMockData(); // Ensure data exists
    const employees = inMemoryStore['employees'] || [];
    console.log('Alternative employees count:', employees.length);
    return c.json(employees);
  } catch (error) {
    console.error('Alternative employees error:', error);
    return c.json({ error: 'Failed to fetch employees: ' + error.message }, 500);
  }
});

app.get("/make-server-e04b5d68/api/tasks", (c) => {
  console.log('Alternative tasks endpoint called');
  try {
    initializeMockData(); // Ensure data exists
    const tasks = inMemoryStore['tasks'] || [];
    console.log('Alternative tasks count:', tasks.length);
    return c.json(tasks);
  } catch (error) {
    console.error('Alternative tasks error:', error);
    return c.json({ error: 'Failed to fetch tasks: ' + error.message }, 500);
  }
});

app.get("/make-server-e04b5d68/api/dashboard/stats", (c) => {
  console.log('Alternative dashboard stats endpoint called');
  try {
    initializeMockData(); // Ensure data exists
    const employees = inMemoryStore['employees'] || [];
    const tasks = inMemoryStore['tasks'] || [];
    const attendance = inMemoryStore['attendance'] || [];
    const leaveRequests = inMemoryStore['leaveRequests'] || [];
    
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = attendance.filter((record: any) => record.date === today);
    
    const stats = {
      totalEmployees: employees.length,
      activeEmployees: employees.filter((emp: any) => emp.availability > 0).length,
      totalTasks: tasks.length,
      pendingTasks: tasks.filter((task: any) => task.status === 'pending').length,
      completedTasks: tasks.filter((task: any) => task.status === 'completed').length,
      presentToday: todayAttendance.filter((record: any) => record.status === 'present').length,
      pendingLeaves: leaveRequests.filter((req: any) => req.status === 'pending').length,
      departments: [...new Set(employees.map((emp: any) => emp.department))].length,
    };
    
    console.log('Alternative dashboard stats:', stats);
    return c.json(stats);
  } catch (error) {
    console.error('Alternative dashboard stats error:', error);
    return c.json({ error: 'Failed to fetch dashboard statistics: ' + error.message }, 500);
  }
});

// Force initialization endpoint
app.post("/make-server-e04b5d68/debug/init", (c) => {
  try {
    // Clear memory and reinitialize
    Object.keys(inMemoryStore).forEach(key => delete inMemoryStore[key]);
    initializeMockData();
    
    return c.json({ 
      message: 'Data reinitialized successfully in memory',
      users: inMemoryStore['users'],
      keys: Object.keys(inMemoryStore)
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// Employee endpoints (no auth required for demo)
app.get("/make-server-e04b5d68/employees", (c) => {
  try {
    console.log('GET /employees - Authorization header:', c.req.header('Authorization'));
    initializeMockData();
    const employees = inMemoryStore['employees'] || [];
    console.log('Returning employees count:', employees.length);
    return c.json(employees);
  } catch (error) {
    console.error('Get employees error:', error);
    return c.json({ error: 'Failed to fetch employees' }, 500);
  }
});

app.get("/make-server-e04b5d68/employees/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const employees = await kv.get('employees') || [];
    const employee = employees.find((emp: any) => emp.id === id);
    
    if (!employee) {
      return c.json({ error: 'Employee not found' }, 404);
    }
    
    return c.json(employee);
  } catch (error) {
    console.error('Get employee error:', error);
    return c.json({ error: 'Failed to fetch employee' }, 500);
  }
});

app.post("/make-server-e04b5d68/employees", async (c) => {
  try {
    const employeeData = await c.req.json();
    const employees = await kv.get('employees') || [];
    
    const newEmployee = {
      ...employeeData,
      id: Date.now().toString(),
      joinDate: new Date().toISOString().split('T')[0],
      currentTasks: 0,
    };
    
    employees.push(newEmployee);
    await kv.set('employees', employees);
    
    return c.json(newEmployee, 201);
  } catch (error) {
    console.error('Create employee error:', error);
    return c.json({ error: 'Failed to create employee' }, 500);
  }
});

app.put("/make-server-e04b5d68/employees/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const updateData = await c.req.json();
    const employees = await kv.get('employees') || [];
    
    const index = employees.findIndex((emp: any) => emp.id === id);
    if (index === -1) {
      return c.json({ error: 'Employee not found' }, 404);
    }
    
    employees[index] = { ...employees[index], ...updateData };
    await kv.set('employees', employees);
    
    return c.json(employees[index]);
  } catch (error) {
    console.error('Update employee error:', error);
    return c.json({ error: 'Failed to update employee' }, 500);
  }
});

// Task endpoints (no auth required for demo)
app.get("/make-server-e04b5d68/tasks", (c) => {
  try {
    console.log('GET /tasks - Authorization header:', c.req.header('Authorization'));
    initializeMockData();
    const tasks = inMemoryStore['tasks'] || [];
    console.log('Returning tasks count:', tasks.length);
    return c.json(tasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    return c.json({ error: 'Failed to fetch tasks' }, 500);
  }
});

app.post("/make-server-e04b5d68/tasks", async (c) => {
  try {
    const taskData = await c.req.json();
    const tasks = await kv.get('tasks') || [];
    
    const newTask = {
      ...taskData,
      id: Date.now().toString(),
      status: 'pending',
      progress: 0,
      createdAt: new Date().toISOString().split('T')[0],
    };
    
    tasks.push(newTask);
    await kv.set('tasks', tasks);
    
    return c.json(newTask, 201);
  } catch (error) {
    console.error('Create task error:', error);
    return c.json({ error: 'Failed to create task' }, 500);
  }
});

app.put("/make-server-e04b5d68/tasks/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const updateData = await c.req.json();
    const tasks = await kv.get('tasks') || [];
    
    const index = tasks.findIndex((task: any) => task.id === id);
    if (index === -1) {
      return c.json({ error: 'Task not found' }, 404);
    }
    
    tasks[index] = { ...tasks[index], ...updateData };
    await kv.set('tasks', tasks);
    
    // Update employee task count if task is assigned/unassigned
    if (updateData.assigned_to || tasks[index].assigned_to) {
      const employees = await kv.get('employees') || [];
      // This is a simplified update - in production you'd want more robust task counting
      await kv.set('employees', employees);
    }
    
    return c.json(tasks[index]);
  } catch (error) {
    console.error('Update task error:', error);
    return c.json({ error: 'Failed to update task' }, 500);
  }
});

// Attendance endpoints (no auth required for demo)  
app.get("/make-server-e04b5d68/attendance", async (c) => {
  try {
    const employeeId = c.req.query('employeeId');
    const date = c.req.query('date');
    
    let attendance = await kv.get('attendance') || [];
    
    if (employeeId) {
      attendance = attendance.filter((record: any) => record.employeeId === employeeId);
    }
    
    if (date) {
      attendance = attendance.filter((record: any) => record.date === date);
    }
    
    return c.json(attendance);
  } catch (error) {
    console.error('Get attendance error:', error);
    return c.json({ error: 'Failed to fetch attendance' }, 500);
  }
});

app.post("/make-server-e04b5d68/attendance", async (c) => {
  try {
    const attendanceData = await c.req.json();
    const attendance = await kv.get('attendance') || [];
    
    const newRecord = {
      ...attendanceData,
      id: Date.now().toString(),
    };
    
    attendance.push(newRecord);
    await kv.set('attendance', attendance);
    
    return c.json(newRecord, 201);
  } catch (error) {
    console.error('Create attendance error:', error);
    return c.json({ error: 'Failed to create attendance record' }, 500);
  }
});

// Leave request endpoints (no auth required for demo)
app.get("/make-server-e04b5d68/leave-requests", async (c) => {
  try {
    const employeeId = c.req.query('employeeId');
    let leaveRequests = await kv.get('leaveRequests') || [];
    
    if (employeeId) {
      leaveRequests = leaveRequests.filter((req: any) => req.employeeId === employeeId);
    }
    
    return c.json(leaveRequests);
  } catch (error) {
    console.error('Get leave requests error:', error);
    return c.json({ error: 'Failed to fetch leave requests' }, 500);
  }
});

app.post("/make-server-e04b5d68/leave-requests", async (c) => {
  try {
    const leaveData = await c.req.json();
    const leaveRequests = await kv.get('leaveRequests') || [];
    
    const newRequest = {
      ...leaveData,
      id: Date.now().toString(),
      status: 'pending',
      appliedAt: new Date().toISOString().split('T')[0],
    };
    
    leaveRequests.push(newRequest);
    await kv.set('leaveRequests', leaveRequests);
    
    return c.json(newRequest, 201);
  } catch (error) {
    console.error('Create leave request error:', error);
    return c.json({ error: 'Failed to create leave request' }, 500);
  }
});

app.put("/make-server-e04b5d68/leave-requests/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const updateData = await c.req.json();
    const leaveRequests = await kv.get('leaveRequests') || [];
    
    const index = leaveRequests.findIndex((req: any) => req.id === id);
    if (index === -1) {
      return c.json({ error: 'Leave request not found' }, 404);
    }
    
    leaveRequests[index] = { 
      ...leaveRequests[index], 
      ...updateData,
      reviewedAt: new Date().toISOString().split('T')[0]
    };
    await kv.set('leaveRequests', leaveRequests);
    
    return c.json(leaveRequests[index]);
  } catch (error) {
    console.error('Update leave request error:', error);
    return c.json({ error: 'Failed to update leave request' }, 500);
  }
});

// Dashboard statistics endpoint (no auth required for demo)
app.get("/make-server-e04b5d68/dashboard/stats", (c) => {
  try {
    console.log('GET /dashboard/stats - Authorization header:', c.req.header('Authorization'));
    initializeMockData();
    const employees = inMemoryStore['employees'] || [];
    const tasks = inMemoryStore['tasks'] || [];
    const attendance = inMemoryStore['attendance'] || [];
    const leaveRequests = inMemoryStore['leaveRequests'] || [];
    
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = attendance.filter((record: any) => record.date === today);
    
    const stats = {
      totalEmployees: employees.length,
      activeEmployees: employees.filter((emp: any) => emp.availability > 0).length,
      totalTasks: tasks.length,
      pendingTasks: tasks.filter((task: any) => task.status === 'pending').length,
      completedTasks: tasks.filter((task: any) => task.status === 'completed').length,
      presentToday: todayAttendance.filter((record: any) => record.status === 'present').length,
      pendingLeaves: leaveRequests.filter((req: any) => req.status === 'pending').length,
      departments: [...new Set(employees.map((emp: any) => emp.department))].length,
    };
    
    console.log('Returning dashboard stats:', stats);
    return c.json(stats);
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    return c.json({ error: 'Failed to fetch dashboard statistics' }, 500);
  }
});

// Initialize data on startup
console.log('Starting server...');
initializeMockData();
console.log('Server initialization complete');

Deno.serve(app.fetch);