// src/pages/LeaveManagement.tsx
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Calendar } from "./ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  CalendarIcon,
  Plus,
  Check,
  X,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";

// DB type (matches Supabase schema)
type LeaveRequest = {
  id: string;
  employee_id: string;
  type: "sick" | "vacation" | "personal" | "emergency";
  start_date: string;
  end_date: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewed_by?: string;
  reviewed_at?: string;
  employee: {
    id: string;
    name: string;
    department: string;
  };
  days: number; // computed
};

export function LeaveManagement() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewRequestDialog, setShowNewRequestDialog] = useState(false);

  useEffect(() => {
    fetchLeaveRequests();
  }, []);

  const fetchLeaveRequests = async () => {
    const { data, error } = await supabase
      .from("leave_requests")
      .select(
        `id, employee_id, type, start_date, end_date, reason, status, reviewed_by, reviewed_at,
         employee:employees ( id, name, department )`
      );

    if (error) {
      console.error("Error fetching leave requests:", error);
    } else if (data) {
      const withDays = data.map((r: any) => ({
        ...r,
        days:
          differenceInDays(new Date(r.end_date), new Date(r.start_date)) + 1,
      }));
      setLeaveRequests(withDays);
    }
  };

  const approveRequest = async (requestId: string) => {
    const { error } = await supabase
      .from("leave_requests")
      .update({
        status: "approved",
        reviewed_by: "HR Manager",
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (!error) fetchLeaveRequests();
  };

  const rejectRequest = async (requestId: string) => {
    const { error } = await supabase
      .from("leave_requests")
      .update({
        status: "rejected",
        reviewed_by: "HR Manager",
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (!error) fetchLeaveRequests();
  };

  const filteredRequests = leaveRequests.filter((request) => {
    const matchesStatus =
      selectedStatus === "all" || request.status === selectedStatus;
    const matchesType = selectedType === "all" || request.type === selectedType;
    const matchesSearch =
      request.employee?.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      request.reason.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesType && matchesSearch;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leave Management</h1>
          <p className="text-muted-foreground">
            Manage employee leave requests and approvals
          </p>
        </div>
        <Button onClick={() => setShowNewRequestDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Request
        </Button>
      </div>

      {/* Leave Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Leave Requests</CardTitle>
          <CardDescription>
            All employee leave requests and their current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {request.employee?.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{request.employee?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {request.employee?.department}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="capitalize">{request.type}</Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(request.start_date), "MMM d")} -{" "}
                    {format(new Date(request.end_date), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>{request.days}</TableCell>
                  <TableCell>{request.reason}</TableCell>
                  <TableCell>
                    <Badge className="capitalize">{request.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {request.status === "pending" ? (
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => approveRequest(request.id)}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => rejectRequest(request.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        {request.reviewed_by && (
                          <p>By: {request.reviewed_by}</p>
                        )}
                        {request.reviewed_at && (
                          <p>
                            {format(
                              new Date(request.reviewed_at),
                              "MMM d, yyyy"
                            )}
                          </p>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* New Request Dialog */}
      <Dialog
        open={showNewRequestDialog}
        onOpenChange={setShowNewRequestDialog}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Leave Request</DialogTitle>
          </DialogHeader>
          <NewLeaveRequestForm
            onClose={() => {
              setShowNewRequestDialog(false);
              fetchLeaveRequests();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NewLeaveRequestForm({ onClose }: { onClose: () => void }) {
  const [employees, setEmployees] = useState<
    { id: string; name: string; department: string }[]
  >([]);
  const [formData, setFormData] = useState({
    employeeId: "",
    type: "",
    startDate: new Date(),
    endDate: new Date(),
    reason: "",
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("id, name, department");
    if (!error && data) setEmployees(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.from("leave_requests").insert({
      employee_id: formData.employeeId,
      type: formData.type,
      start_date: formData.startDate.toISOString().slice(0, 10),
      end_date: formData.endDate.toISOString().slice(0, 10),
      reason: formData.reason,
      status: "pending",
    });

    if (!error) {
      onClose();
    } else {
      console.error("Error submitting request:", error);
    }
  };

  const days = differenceInDays(formData.endDate, formData.startDate) + 1;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Employee Dropdown */}
      <div>
        <Label>Employee</Label>
        <Select
          value={formData.employeeId}
          onValueChange={(value: string) =>
            setFormData({ ...formData, employeeId: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select employee" />
          </SelectTrigger>
          <SelectContent>
            {employees.map((employee) => (
              <SelectItem key={employee.id} value={employee.id}>
                {employee.name} – {employee.department}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Leave Type */}
      <div>
        <Label>Leave Type</Label>
        <Select
          value={formData.type}
          onValueChange={(value: string) =>
            setFormData({ ...formData, type: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select leave type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sick">Sick Leave</SelectItem>
            <SelectItem value="vacation">Vacation</SelectItem>
            <SelectItem value="personal">Personal Leave</SelectItem>
            <SelectItem value="emergency">Emergency Leave</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Start Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(formData.startDate, "MMM d, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.startDate}
                onSelect={(date: Date | undefined) =>
                  date && setFormData({ ...formData, startDate: date })
                }
              />
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <Label>End Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(formData.endDate, "MMM d, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.endDate}
                onSelect={(date: Date | undefined) =>
                  date && setFormData({ ...formData, endDate: date })
                }
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Duration: {days} day{days !== 1 ? "s" : ""}
      </div>

      {/* Reason */}
      <div>
        <Label>Reason</Label>
        <Textarea
          value={formData.reason}
          onChange={(e) =>
            setFormData({ ...formData, reason: e.target.value })
          }
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">Submit Request</Button>
      </div>
    </form>
  );
}
