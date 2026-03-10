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
import { Input } from "./ui/input";
import {
  CalendarIcon,
  Plus,
  Check,
  X,
  Search,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import type { UserRole } from "../types/auth";
import { canApproveLeaves } from "../utils/permissions";

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
    role: string; // needed to route approval correctly
  };
  days: number; // computed
};

interface LeaveManagementProps {
  userRole?: UserRole;
  userName?: string;
  userId?: string;
}

export function LeaveManagement({ userRole, userName, userId }: LeaveManagementProps) {
  const canApprove = canApproveLeaves(userRole);
  const isAdmin = userRole === 'admin';
  const isHr = userRole === 'hr';
  const isManager = userRole === 'manager';
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
         employee:employees ( id, name, department, role )`
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

  // Approval routing:
  //   HR / Manager requests  →  only admin can approve
  //   Employee requests      →  admin OR hr can approve
  const canApproveRequest = (request: LeaveRequest): boolean => {
    if (!canApprove) return false;
    const requesterRole = request.employee?.role;
    if (requesterRole === 'hr' || requesterRole === 'manager') {
      return isAdmin;
    }
    return true; // admin or hr can approve employee requests
  };

  const approveRequest = async (requestId: string) => {
    const { error } = await supabase
      .from("leave_requests")
      .update({
        status: "approved",
        reviewed_by: userName ?? "Admin",
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
        reviewed_by: userName ?? "Admin",
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
      (request.employee?.name ?? "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (request.reason ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesType && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 capitalize">{status}</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 capitalize">{status}</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 capitalize">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leave Management</h1>
          <p className="text-muted-foreground">
            {isAdmin
              ? "Review and approve leave requests from all staff"
              : isHr
              ? "Manage employee leave requests and submit your own"
              : isManager
              ? "View team leave requests and submit your own"
              : "Manage employee leave requests"}
          </p>
        </div>
        {/* Admin cannot request leave — admin only approves */}
        {!isAdmin && (
          <Button onClick={() => setShowNewRequestDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or reason..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="sick">Sick Leave</SelectItem>
                <SelectItem value="vacation">Vacation</SelectItem>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Leave Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Leave Requests</CardTitle>
          <CardDescription>
            {filteredRequests.length} request{filteredRequests.length !== 1 ? "s" : ""} found
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
              {filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No leave requests found
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {(request.employee?.name ?? "?")
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{request.employee?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {request.employee?.department}
                            {request.employee?.role && request.employee.role !== 'employee' && (
                              <span className="ml-1 capitalize opacity-70">· {request.employee.role}</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{request.type}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(request.start_date), "MMM d")} —{" "}
                      {format(new Date(request.end_date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>{request.days}</TableCell>
                    <TableCell className="max-w-48 truncate text-sm">{request.reason}</TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>
                      {request.status === "pending" && canApproveRequest(request) ? (
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-green-500 text-green-700 hover:bg-green-50"
                            onClick={() => approveRequest(request.id)}
                            title="Approve"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-500 text-red-700 hover:bg-red-50"
                            onClick={() => rejectRequest(request.id)}
                            title="Reject"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : request.status === "pending" ? (
                        <Badge variant="outline" className="text-xs">
                          {(request.employee?.role === 'hr' || request.employee?.role === 'manager')
                            ? "Awaiting Admin"
                            : "Awaiting Review"}
                        </Badge>
                      ) : (
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          {request.reviewed_by && <p>By: {request.reviewed_by}</p>}
                          {request.reviewed_at && (
                            <p>{format(new Date(request.reviewed_at), "MMM d, yyyy")}</p>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
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
            userRole={userRole}
            userId={userId}
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

interface NewLeaveRequestFormProps {
  userRole?: UserRole;
  userId?: string;
  onClose: () => void;
}

function NewLeaveRequestForm({ userRole, userId, onClose }: NewLeaveRequestFormProps) {
  const isManager = userRole === 'manager';

  const [employees, setEmployees] = useState<
    { id: string; name: string; department: string; role: string }[]
  >([]);
  const [formData, setFormData] = useState({
    employeeId: userId ?? "",
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
      .select("id, name, department, role");
    if (!error && data) {
      if (isManager && userId) {
        // Manager can only submit leave for themselves
        const self = data.filter((e: any) => e.id === userId);
        setEmployees(self);
        setFormData(prev => ({ ...prev, employeeId: userId }));
      } else {
        // HR can submit for any non-admin employee (including themselves)
        setEmployees(data.filter((e: any) => e.role !== 'admin'));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId || !formData.type) return;

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

  const days = Math.max(1, differenceInDays(formData.endDate, formData.startDate) + 1);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Employee selector — managers always submit for themselves (hidden) */}
      {!isManager && (
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
      )}

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

      <p className="text-sm text-muted-foreground">
        Duration: {days} day{days !== 1 ? "s" : ""}
      </p>

      {/* Reason */}
      <div>
        <Label>Reason</Label>
        <Textarea
          value={formData.reason}
          onChange={(e) =>
            setFormData({ ...formData, reason: e.target.value })
          }
          placeholder="Briefly describe the reason for leave..."
          rows={3}
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!formData.employeeId || !formData.type}
        >
          Submit Request
        </Button>
      </div>
    </form>
  );
}
