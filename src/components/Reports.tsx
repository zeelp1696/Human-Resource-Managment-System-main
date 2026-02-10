import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import type { Employee, Task } from "../utils/api";
import { apiService } from "../utils/api";
import { getSkillGaps } from "../utils/skillMatching";
import jsPDF from "jspdf";
import "jspdf-autotable";

export function Reports() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
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
    } catch (error) {
      console.error("Failed to fetch report data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const skillGaps = employees.length > 0 && tasks.length > 0 ? getSkillGaps(employees as any, tasks as any) : [];

  const workloadDistribution = employees.map((emp) => ({
    name: emp.name,
    tasks: (emp as any).currentTasks ?? 0,
  }));

  const taskStatusData = [
    { name: "Completed", value: tasks.filter((t) => t.status === "completed").length },
    { name: "In Progress", value: tasks.filter((t) => t.status === "in-progress").length },
    { name: "Pending", value: tasks.filter((t) => t.status === "pending").length },
    { name: "Assigned", value: tasks.filter((t) => t.status === "assigned").length },
  ];

  const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#6B7280"];

  // -------------------- EXPORT FUNCTIONS --------------------
  const exportCSV = () => {
    const headers = ["Skill", "Demand", "Supply", "Gap"];
    const rows = skillGaps.map((gap) => [gap.skill, gap.demand, gap.supply, gap.gap]);

    let csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "reports.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("HRMS Reports", 14, 15);

    // Skill Gaps Table
    (doc as any).autoTable({
      head: [["Skill", "Demand", "Supply", "Gap"]],
      body: skillGaps.map((gap) => [gap.skill, gap.demand, gap.supply, gap.gap]),
      startY: 25,
    });

    doc.save("reports.pdf");
  };

  // -------------------- RENDER --------------------
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports & Analysis</h1>
        <div className="space-x-2">
          <Button onClick={exportCSV}>Export CSV</Button>
          <Button onClick={exportPDF}>Export PDF</Button>
        </div>
      </div>

      {/* Skill Gaps */}
      <Card>
        <CardHeader>
          <CardTitle>Skill Gaps</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading...</p>
          ) : skillGaps.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={skillGaps}>
                <XAxis dataKey="skill" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="demand" fill="#3B82F6" />
                <Bar dataKey="supply" fill="#10B981" />
                <Bar dataKey="gap" fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p>No skill gap data available</p>
          )}
        </CardContent>
      </Card>

      {/* Workload Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Workload Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading...</p>
          ) : workloadDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={workloadDistribution} dataKey="tasks" nameKey="name" outerRadius={100} label>
                  {workloadDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p>No workload data available</p>
          )}
        </CardContent>
      </Card>

      {/* Task Completion */}
      <Card>
        <CardHeader>
          <CardTitle>Task Completion Status</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading...</p>
          ) : taskStatusData.some((d) => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={taskStatusData} dataKey="value" nameKey="name" outerRadius={100} label>
                  {taskStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p>No task data available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
