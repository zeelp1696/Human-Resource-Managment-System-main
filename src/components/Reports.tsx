import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid,
} from "recharts";
import type { Employee, Task } from "../utils/api";
import { apiService } from "../utils/api";
import { supabase } from "../supabase";
import { getSkillGaps } from "../utils/skillMatching";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { Users, Briefcase, Calendar, Clock, TrendingUp, Download } from "lucide-react";

export function Reports() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [leaveData, setLeaveData] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [employeesData, tasksData] = await Promise.all([
        apiService.getEmployees(),
        apiService.getTasks(),
      ]);
      setEmployees(employeesData);
      setTasks(tasksData);

      // Fetch leave requests
      const { data: leaves } = await supabase
        .from("leave_requests")
        .select("id, type, status, start_date, end_date, employee_id");
      setLeaveData(leaves ?? []);

      // Fetch recent 30 days attendance
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data: attendance } = await supabase
        .from("attendance")
        .select("id, status, date, employee_id")
        .gte("date", thirtyDaysAgo.toISOString().slice(0, 10));
      setAttendanceData(attendance ?? []);
    } catch (error) {
      console.error("Failed to fetch report data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // ---- Derived Data ----
  const totalEmployees = employees.length;
  const totalTasks = tasks.length;

  // Department headcount
  const departments = [...new Set(employees.map((e) => e.department).filter(Boolean))];
  const deptHeadcount = departments.map((dept) => ({
    name: dept,
    count: employees.filter((e) => e.department === dept).length,
  }));

  // Role distribution
  const roleDistribution = [
    { name: "Admin", value: employees.filter((e) => e.role === "admin").length },
    { name: "HR", value: employees.filter((e) => e.role === "hr").length },
    { name: "Manager", value: employees.filter((e) => e.role === "manager").length },
    { name: "Employee", value: employees.filter((e) => !e.role || e.role === "employee").length },
  ].filter((r) => r.value > 0);

  // Task status
  const taskStatusData = [
    { name: "Completed", value: tasks.filter((t) => t.status === "completed").length },
    { name: "In Progress", value: tasks.filter((t) => t.status === "in-progress").length },
    { name: "Pending", value: tasks.filter((t) => t.status === "pending").length },
    { name: "Assigned", value: tasks.filter((t) => t.status === "assigned").length },
  ].filter((d) => d.value > 0);

  // Leave breakdown
  const leaveByStatus = [
    { name: "Approved", value: leaveData.filter((l) => l.status === "approved").length },
    { name: "Pending", value: leaveData.filter((l) => l.status === "pending").length },
    { name: "Rejected", value: leaveData.filter((l) => l.status === "rejected").length },
  ].filter((d) => d.value > 0);

  const leaveByType = [
    { name: "Sick", value: leaveData.filter((l) => l.type === "sick").length },
    { name: "Vacation", value: leaveData.filter((l) => l.type === "vacation").length },
    { name: "Personal", value: leaveData.filter((l) => l.type === "personal").length },
    { name: "Emergency", value: leaveData.filter((l) => l.type === "emergency").length },
  ].filter((d) => d.value > 0);

  // Attendance summary (last 30 days)
  const attendanceSummary = [
    { name: "Present", value: attendanceData.filter((a) => a.status === "present").length },
    { name: "Late", value: attendanceData.filter((a) => a.status === "late").length },
    { name: "Absent", value: attendanceData.filter((a) => a.status === "absent").length },
    { name: "Half Day", value: attendanceData.filter((a) => a.status === "half-day").length },
  ].filter((d) => d.value > 0);

  // Skill gaps
  const skillGaps = employees.length > 0 && tasks.length > 0 ? getSkillGaps(employees as any, tasks as any) : [];

  const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];
  const LEAVE_COLORS = ["#10B981", "#F59E0B", "#EF4444"];
  const ATTENDANCE_COLORS = ["#10B981", "#F59E0B", "#EF4444", "#3B82F6"];

  // ---- Export ----
  const exportCSV = () => {
    const sections = [
      ["Department Headcount"],
      ["Department", "Count"],
      ...deptHeadcount.map((d) => [d.name, String(d.count)]),
      [""],
      ["Task Status"],
      ["Status", "Count"],
      ...taskStatusData.map((d) => [d.name, String(d.value)]),
      [""],
      ["Leave Summary"],
      ["Status", "Count"],
      ...leaveByStatus.map((d) => [d.name, String(d.value)]),
    ];
    const csv = sections.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "hrms_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("HRMS Reports", 14, 15);

    (doc as any).autoTable({
      head: [["Department", "Employees"]],
      body: deptHeadcount.map((d) => [d.name, d.count]),
      startY: 25,
    });

    const afterDept = (doc as any).lastAutoTable.finalY + 10;
    (doc as any).autoTable({
      head: [["Task Status", "Count"]],
      body: taskStatusData.map((d) => [d.name, d.value]),
      startY: afterDept,
    });

    const afterTask = (doc as any).lastAutoTable.finalY + 10;
    (doc as any).autoTable({
      head: [["Leave Status", "Count"]],
      body: leaveByStatus.map((d) => [d.name, d.value]),
      startY: afterTask,
    });

    doc.save("hrms_report.pdf");
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Reports & Analysis</h1>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6"><div className="h-16 bg-gray-200 rounded"></div></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports & Analysis</h1>
        <div className="space-x-2">
          <Button variant="outline" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" /> CSV
          </Button>
          <Button variant="outline" onClick={exportPDF}>
            <Download className="h-4 w-4 mr-2" /> PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmployees}</div>
            <p className="text-xs text-muted-foreground">{departments.length} departments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTasks}</div>
            <p className="text-xs text-muted-foreground">
              {tasks.filter((t) => t.status === "completed").length} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leave Requests</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leaveData.length}</div>
            <p className="text-xs text-muted-foreground">
              {leaveData.filter((l) => l.status === "pending").length} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance (30d)</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceData.length}</div>
            <p className="text-xs text-muted-foreground">
              {attendanceData.length > 0
                ? Math.round(
                    ((attendanceData.filter((a) => a.status === "present").length +
                      attendanceData.filter((a) => a.status === "late").length) /
                      attendanceData.length) *
                      100
                  )
                : 0}% attendance rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1: Department + Role */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Department Headcount</CardTitle>
            <CardDescription>Number of employees per department</CardDescription>
          </CardHeader>
          <CardContent>
            {deptHeadcount.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={deptHeadcount}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground">No department data</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Role Distribution</CardTitle>
            <CardDescription>Breakdown by system role</CardDescription>
          </CardHeader>
          <CardContent>
            {roleDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={roleDistribution} dataKey="value" nameKey="name" outerRadius={100} label>
                    {roleDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground">No role data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: Task Status + Leave Status */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Task Completion Status</CardTitle>
            <CardDescription>Current task distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {taskStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={taskStatusData} dataKey="value" nameKey="name" outerRadius={100} label>
                    {taskStatusData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground">No task data</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leave Requests</CardTitle>
            <CardDescription>By approval status</CardDescription>
          </CardHeader>
          <CardContent>
            {leaveByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={leaveByStatus} dataKey="value" nameKey="name" outerRadius={100} label>
                    {leaveByStatus.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={LEAVE_COLORS[index % LEAVE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground">No leave data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 3: Attendance + Leave by Type */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Attendance Summary (Last 30 Days)</CardTitle>
            <CardDescription>Attendance status breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {attendanceSummary.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={attendanceSummary}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {attendanceSummary.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={ATTENDANCE_COLORS[index % ATTENDANCE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground">No attendance data for the last 30 days</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leave by Type</CardTitle>
            <CardDescription>Distribution of leave categories</CardDescription>
          </CardHeader>
          <CardContent>
            {leaveByType.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={leaveByType} dataKey="value" nameKey="name" outerRadius={100} label>
                    {leaveByType.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground">No leave type data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Skill Gaps */}
      {skillGaps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Skill Gaps</CardTitle>
            <CardDescription>Skills in demand vs available supply</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={skillGaps}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="skill" fontSize={12} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="demand" fill="#3B82F6" />
                <Bar dataKey="supply" fill="#10B981" />
                <Bar dataKey="gap" fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
