// src/components/Settings.tsx
import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { toast } from "sonner";
import { Briefcase, Bell, Shield, Info } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

const EMPLOYEE_TASK_KEY = "employeeTaskAccess";

const Settings: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const [employeeTaskAccess, setEmployeeTaskAccess] = useState(
    localStorage.getItem(EMPLOYEE_TASK_KEY) === "true"
  );

  const [notifyOnLeave, setNotifyOnLeave] = useState(
    localStorage.getItem("notifyOnLeave") !== "false"
  );

  const [notifyOnTask, setNotifyOnTask] = useState(
    localStorage.getItem("notifyOnTask") !== "false"
  );

  const handleEmployeeTaskToggle = (checked: boolean) => {
    setEmployeeTaskAccess(checked);
    localStorage.setItem(EMPLOYEE_TASK_KEY, String(checked));
    toast.success(
      checked
        ? "Employees can now view and assign tasks to each other."
        : "Employee task access has been disabled."
    );
  };

  const handleNotifyLeave = (checked: boolean) => {
    setNotifyOnLeave(checked);
    localStorage.setItem("notifyOnLeave", String(checked));
    toast.success("Notification setting updated.");
  };

  const handleNotifyTask = (checked: boolean) => {
    setNotifyOnTask(checked);
    localStorage.setItem("notifyOnTask", String(checked));
    toast.success("Notification setting updated.");
  };

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">System Settings</h1>
        <p className="text-muted-foreground">
          Configure system-wide preferences. Only admins can access this page.
        </p>
      </div>

      {/* Task Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            <CardTitle>Task Settings</CardTitle>
          </div>
          <CardDescription>
            Control how tasks are managed across roles
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">
                  Allow employees to create and assign tasks
                </Label>
                {employeeTaskAccess && (
                  <Badge className="bg-green-100 text-green-800 text-xs">Active</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                When enabled, employees can view the full task board, create new
                tasks, and assign them to each other — like internal teamwork in
                real companies.
              </p>
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <Info className="h-3 w-3" />
                <span>When off, employees only see tasks assigned to them.</span>
              </div>
            </div>
            <Switch
              checked={employeeTaskAccess}
              onCheckedChange={handleEmployeeTaskToggle}
            />
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Appearance</CardTitle>
          </div>
          <CardDescription>System-wide display preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Theme</Label>
              <p className="text-xs text-muted-foreground">
                Currently:{" "}
                <span className="capitalize font-medium">{theme}</span>
              </p>
            </div>
            <div className="flex gap-2">
              {(["light", "dark", "system"] as const).map((t) => (
                <Button
                  key={t}
                  size="sm"
                  variant={theme === t ? "default" : "outline"}
                  className="capitalize text-xs"
                  onClick={() => {
                    setTheme(t);
                    toast.success(`Theme set to ${t}`);
                  }}
                >
                  {t}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle>Notifications</CardTitle>
          </div>
          <CardDescription>System notification preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Leave request alerts</Label>
              <p className="text-xs text-muted-foreground">
                Notify when new leave requests are submitted
              </p>
            </div>
            <Switch
              checked={notifyOnLeave}
              onCheckedChange={handleNotifyLeave}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Task assignment alerts</Label>
              <p className="text-xs text-muted-foreground">
                Notify when a task is assigned or updated
              </p>
            </div>
            <Switch
              checked={notifyOnTask}
              onCheckedChange={handleNotifyTask}
            />
          </div>
        </CardContent>
      </Card>

      {/* Info footer */}
      <Card className="border-dashed">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              All settings are saved instantly to this browser. The employee
              task access setting applies the next time an employee refreshes
              their portal.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
