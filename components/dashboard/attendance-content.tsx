"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  Calendar as CalendarIcon,
  RefreshCw,
  Search,
  Users,
  CheckCircle,
  AlertTriangle,
  Clock,
  MessageSquare,
  FileSpreadsheet,
  Settings,
  ShieldAlert,
  UserCheck,
  Edit,
  UserX
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { getToken } from "@/lib/api";

interface AttendanceRecord {
  student: {
    id: number;
    name: string;
    contact: string;
    standard: string;
    course: string;
    branch: string;
    code: string;
  };
  role: "STUDENT" | "TEACHER";
  date: string;
  punchIn: string | null;
  punchOut: string | null;
  status: "Present" | "Absent" | "Late" | "Half-Day" | "On Leave";
  source: "Manual" | "Smart Office";
  batch: {
    id: number | null;
    name: string;
  };
  manuallyEdited: boolean;
}

export function AttendanceContent() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [role, setRole] = useState<"STUDENT" | "TEACHER">("STUDENT");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [standardFilter, setStandardFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [isConfigured, setIsConfigured] = useState(true);

  // Custom Export Modal State
  const [isCustomExportOpen, setIsCustomExportOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [customEndDate, setCustomEndDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [customRole, setCustomRole] = useState<"STUDENT" | "TEACHER">("STUDENT");
  const [customUsersList, setCustomUsersList] = useState<any[]>([]);
  const [customSelectedUserIds, setCustomSelectedUserIds] = useState<Set<number>>(new Set());
  const [customExporting, setCustomExporting] = useState(false);

  const fetchCustomUsers = useCallback(async (role: string) => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://institute-api.rhaitech.online/api";
      const headers = getHeaders();
      const endpoint = role === "STUDENT" ? "/students" : "/teachers";
      const res = await fetch(`${apiBase}${endpoint}`, { headers });
      if (!res.ok) throw new Error("Failed to fetch users");
      const json = await res.json();
      setCustomUsersList(json.data || json || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch users for export");
    }
  }, []);

  useEffect(() => {
    if (isCustomExportOpen) {
      fetchCustomUsers(customRole);
    }
  }, [isCustomExportOpen, customRole, fetchCustomUsers]);

  const getHeaders = (): Record<string, string> => {
    const token = getToken();
    return token ? { "Authorization": `Bearer ${token}` } : {};
  };

  // Edit record modal state
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editStatus, setEditStatus] = useState<AttendanceRecord["status"]>("Present");
  const [editPunchIn, setEditPunchIn] = useState("");
  const [editPunchOut, setEditPunchOut] = useState("");
  const [editBioCode, setEditBioCode] = useState("");
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Fetch Attendance logs
  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://institute-api.rhaitech.online/api";
      const headers = getHeaders();
      const res = await fetch(`${apiBase}/attendance?date=${date}&role=${role}`, { headers });
      
      if (!res.ok) throw new Error("Failed to fetch attendance data.");
      
      const json = await res.json();
      setRecords(json.records || []);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to load attendance logs");
    } finally {
      setLoading(false);
    }
  }, [date, role]);

  // Initial Fetch & config check
  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Sync Biometric logs
  const handleSync = async () => {
    setSyncing(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://institute-api.rhaitech.online/api";
      const headers = getHeaders();
      const res = await fetch(`${apiBase}/attendance/sync`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ date, role })
      });

      if (!res.ok) {
        throw new Error("Smart Office sync failed. Device offline or pending config.");
      }

      const json = await res.json();
      setRecords(json.records || []);
      toast.success("Successfully synchronized device logs from Smart Office!");
    } catch (err: any) {
      console.warn(err);
      toast.warning("Hardware Sync Pending: Smart Office device offline or API key unconfigured. Sync fallback manual mode active.");
      setIsConfigured(false);
    } finally {
      setSyncing(false);
    }
  };

  // Mark On Leave
  const handleMarkLeave = async (record: AttendanceRecord) => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://institute-api.rhaitech.online/api";
      const headers = getHeaders();
      const res = await fetch(`${apiBase}/attendance/leave`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          studentCode: record.student.code,
          date,
          batchId: record.batch.id,
          role
        })
      });

      if (!res.ok) throw new Error("Failed to mark leave.");
      
      toast.success(`Marked ${record.student.name} on Leave successfully`);
      fetchAttendance();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Auto-update attendance status
  const autoUpdateStatus = async (record: AttendanceRecord, newStatus: string) => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://institute-api.rhaitech.online/api";
      const headers = getHeaders();
      const res = await fetch(`${apiBase}/attendance/record`, {
        method: "PUT",
        headers: {
          ...headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          studentCode: record.student.code,
          date,
          status: newStatus,
          punchIn: record.punchIn || null,
          punchOut: record.punchOut || null,
          batchId: record.batch.id,
          role
        })
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to update attendance.");
      }
      toast.success("Attendance updated!");
      fetchAttendance();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Open Edit Modal
  const openEditModal = (record: AttendanceRecord) => {
    setEditingRecord(record);
    setEditStatus(record.status);
    setEditPunchIn(record.punchIn || "");
    setEditPunchOut(record.punchOut || "");
    setEditBioCode(record.student.code || "");
    setIsEditOpen(true);
  };

  // Save manual attendance adjustment
  const handleSaveEdit = async () => {
    if (!editingRecord) return;
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://institute-api.rhaitech.online/api";
      const headers = getHeaders();

      // 1. Update bio code first if it changed, so the attendance record lookup succeeds
      if (editBioCode !== (editingRecord.student.code || "")) {
        const bioRes = await fetch(`${apiBase}/attendance/bio-code`, {
          method: "PUT",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: editingRecord.student.id,
            role,
            newBioCode: editBioCode
          })
        });
        if (!bioRes.ok) throw new Error("Failed to update Bio Code");
      }

      // 2. Update attendance record
      const res = await fetch(`${apiBase}/attendance/record`, {
        method: "PUT",
        headers: {
          ...headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          studentCode: editBioCode || editingRecord.student.code,
          date,
          status: editStatus,
          punchIn: editPunchIn || null,
          punchOut: editPunchOut || null,
          batchId: editingRecord.batch.id,
          role
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to record manual adjustment.");
      }

      toast.success("Attendance adjusted successfully!");
      setIsEditOpen(false);
      fetchAttendance();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Send Notifications Broadcast
  const handleSendNotifications = async () => {
    setNotifying(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://institute-api.rhaitech.online/api";
      const headers = getHeaders();
      const res = await fetch(`${apiBase}/attendance/notify-all`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ date, role })
      });

      if (!res.ok) throw new Error("Failed to trigger notifications.");

      const json = await res.json();
      toast.success(json.message || "Notification loop triggered!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setNotifying(false);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (records.length === 0) {
      toast.error("No records to export.");
      return;
    }
    const rows = records.map((r) => ({
      "Biometric Code": r.student.code || "N/A",
      "Name": r.student.name,
      "Role": r.role,
      "Contact": r.student.contact || "N/A",
      "Class/Standard": r.student.standard || "N/A",
      "Branch": r.student.branch || "N/A",
      "Date": r.date,
      "Punch In": r.punchIn || "—",
      "Punch Out": r.punchOut || "—",
      "Status": r.status,
      "Source": r.source
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Logs");
    XLSX.writeFile(workbook, `attendance_${role.toLowerCase()}_${date}.xlsx`);
    toast.success("Logs exported to Excel successfully!");
  };

  const handleExportMonthlyExcel = async () => {
    try {
      const monthStr = date.substring(0, 7); // YYYY-MM
      toast.info(`Fetching monthly report for ${monthStr}...`);
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://institute-api.rhaitech.online/api";
      const headers = getHeaders();
      const res = await fetch(`${apiBase}/attendance/monthly-report?month=${monthStr}&role=${role}`, { headers });
      if (!res.ok) throw new Error("Failed to fetch monthly report");
      
      const json = await res.json();
      if (!json.success || !json.report) throw new Error("Invalid report data");
      
      const report = json.report;
      
      const allDates = new Set<string>();
      report.forEach((user: any) => {
        Object.keys(user.attendance || {}).forEach(d => allDates.add(d));
      });
      const sortedDates = Array.from(allDates).sort();
      
      const rows = report.map((user: any) => {
        const row: any = {
          "Name": user.name,
          "Contact": user.contact,
          "Code": user.code,
        };
        if (role === "STUDENT") {
          row["Standard"] = user.standard;
        }
        
        let present = 0, absent = 0, late = 0, onLeave = 0;
        
        sortedDates.forEach(d => {
          const status = user.attendance[d]?.status || "—";
          row[d] = status;
          if (status === "Present") present++;
          else if (status === "Absent") absent++;
          else if (status === "Late") late++;
          else if (status === "On Leave") onLeave++;
        });
        
        row["Total Present"] = present;
        row["Total Absent"] = absent;
        row["Total Late"] = late;
        row["Total Leave"] = onLeave;
        
        return row;
      });
      
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Monthly Report");
      XLSX.writeFile(workbook, `attendance_monthly_${role.toLowerCase()}_${monthStr}.xlsx`);
      toast.success("Monthly report exported successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to export monthly report");
    }
  };

  const handleExportCustomReport = async () => {
    if (!customStartDate || !customEndDate) {
      toast.error("Start Date and End Date are required");
      return;
    }
    
    setCustomExporting(true);
    try {
      toast.info(`Fetching custom report...`);
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://institute-api.rhaitech.online/api";
      const headers = getHeaders();
      
      let url = `${apiBase}/attendance/custom-report?startDate=${customStartDate}&endDate=${customEndDate}&role=${customRole}`;
      if (customSelectedUserIds.size > 0) {
        url += `&userIds=${Array.from(customSelectedUserIds).join(",")}`;
      }
      
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error("Failed to fetch custom report");
      
      const json = await res.json();
      if (!json.success || !json.report) throw new Error("Invalid report data");
      
      const report = json.report;
      
      // Determine all dates present in the response
      const allDates = new Set<string>();
      report.forEach((user: any) => {
        Object.keys(user.attendance || {}).forEach(d => allDates.add(d));
      });
      const sortedDates = Array.from(allDates).sort();
      
      const rows = report.map((user: any) => {
        const row: any = {
          "Name": user.name,
          "Contact": user.contact,
          "Code": user.code,
        };
        if (customRole === "STUDENT") {
          row["Standard"] = user.standard;
        }
        
        let present = 0, absent = 0, late = 0, onLeave = 0;
        
        sortedDates.forEach(d => {
          const status = user.attendance[d]?.status || "—";
          row[d] = status;
          if (status === "Present") present++;
          else if (status === "Absent") absent++;
          else if (status === "Late") late++;
          else if (status === "On Leave") onLeave++;
        });
        
        row["Total Present"] = present;
        row["Total Absent"] = absent;
        row["Total Late"] = late;
        row["Total Leave"] = onLeave;
        
        return row;
      });
      
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Custom Report");
      XLSX.writeFile(workbook, `attendance_custom_${customRole.toLowerCase()}_${customStartDate}_to_${customEndDate}.xlsx`);
      toast.success("Custom report exported successfully!");
      setIsCustomExportOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to export custom report");
    } finally {
      setCustomExporting(false);
    }
  };

  // Import from Excel mapping helper
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json<any>(worksheet);

        if (data.length === 0) throw new Error("Excel is empty.");

        toast.info(`Parsed ${data.length} records. Simulating mapping adjustments...`);
        // Real logic would push updates to DB or populate mapping codes
      } catch (err: any) {
        toast.error("Failed to import Excel data: " + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Compute dynamic filter options
  const uniqueStandards = useMemo(() => {
    return Array.from(new Set(records.map(r => r.student?.standard).filter(Boolean))).sort();
  }, [records]);

  const uniqueBranches = useMemo(() => {
    return Array.from(new Set(records.map(r => r.student?.branch).filter(Boolean))).sort();
  }, [records]);

  // Compute summary stats dynamically
  const summary = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = records.filter(r => {
      const matchSearch = !q || 
                          (r.student?.name?.toLowerCase() || "").includes(q) || 
                          (r.student?.code?.toLowerCase() || "").includes(q) ||
                          (r.student?.contact?.toLowerCase() || "").includes(q);
      const matchStatus = !statusFilter || r.status === statusFilter;
      const matchStandard = role !== "STUDENT" || !standardFilter || r.student?.standard === standardFilter;
      const matchBranch = role !== "STUDENT" || !branchFilter || r.student?.branch === branchFilter;
      return matchSearch && matchStatus && matchStandard && matchBranch;
    });

    return {
      records: filtered,
      total: filtered.length,
      present: filtered.filter(r => r.status === "Present").length,
      absent: filtered.filter(r => r.status === "Absent").length,
      late: filtered.filter(r => r.status === "Late").length,
      onLeave: filtered.filter(r => r.status === "On Leave").length,
      halfDay: filtered.filter(r => r.status === "Half-Day").length
    };
  }, [records, search, statusFilter, standardFilter, branchFilter, role]);

  const handleRoleChange = (newRole: "STUDENT" | "TEACHER") => {
    setRole(newRole);
    setStandardFilter("");
    setBranchFilter("");
  };

  return (
    <div className="space-y-6">
      
      {/* Title & Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent flex items-center gap-2.5">
            <UserCheck className="h-8 w-8 text-primary" /> Attendance Center
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure, manage, and manually adjust Student & Teacher Biometric logs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Role Toggle Switch */}
          <div className="inline-flex rounded-xl border bg-muted p-1">
            <button
              onClick={() => handleRoleChange("STUDENT")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                role === "STUDENT" ? "bg-white shadow-sm text-primary" : "text-muted-foreground"
              }`}
            >
              Students
            </button>
            <button
              onClick={() => handleRoleChange("TEACHER")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                role === "TEACHER" ? "bg-white shadow-sm text-primary" : "text-muted-foreground"
              }`}
            >
              Teachers
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
            className="border-primary/20 hover:bg-primary/5 text-primary rounded-xl font-semibold gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync Biometric"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="border-emerald-500/20 hover:bg-emerald-50 text-emerald-700 rounded-xl font-semibold gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" /> Daily Excel
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportMonthlyExcel}
            className="border-indigo-500/20 hover:bg-indigo-50 text-indigo-700 rounded-xl font-semibold gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" /> Monthly Excel
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCustomSelectedUserIds(new Set());
              setIsCustomExportOpen(true);
            }}
            className="border-blue-500/20 hover:bg-blue-50 text-blue-700 rounded-xl font-semibold gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" /> Custom Export
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSendNotifications}
            disabled={records.length === 0 || notifying}
            className="border-green-500/20 hover:bg-green-50 text-green-700 rounded-xl font-semibold gap-2"
          >
            <MessageSquare className="h-4 w-4" /> Send Notifications
          </Button>
        </div>
      </div>

      {/* Warning banner for missing configuration state */}
      {!isConfigured && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3.5 shadow-sm animate-pulse">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800">Hardware Sync Pending (Fallback Mode Active)</p>
            <p className="text-xs text-amber-700 mt-0.5">
              The Smart Office hardware token / serial configuration is not detected in `.env`. The sync is running in simulation backup mode. Manual modifications are enabled.
            </p>
          </div>
        </div>
      )}

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total Monitored", val: summary.total, color: "text-slate-900", icon: Users, bg: "bg-slate-50" },
          { label: "Present", val: summary.present, color: "text-emerald-700", icon: CheckCircle, bg: "bg-emerald-50" },
          { label: "Absent", val: summary.absent, color: "text-red-700", icon: UserX, bg: "bg-red-50" },
          { label: "Late In", val: summary.late, color: "text-amber-700", icon: Clock, bg: "bg-amber-50" },
          { label: "On Leave", val: summary.onLeave, color: "text-indigo-700", icon: ShieldAlert, bg: "bg-indigo-50" },
        ].map((item, idx) => (
          <Card key={idx} className={`border border-border/70 rounded-2xl shadow-sm ${item.bg}`}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{item.label}</p>
                <p className={`text-2xl font-black mt-1 ${item.color}`}>{item.val}</p>
              </div>
              <item.icon className="h-5 w-5 opacity-40 shrink-0" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter and Table Content */}
      <Card className="rounded-2xl border-border/70 shadow-[var(--shadow-soft)] overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <CalendarIcon className="h-4.5 w-4.5 text-primary" /> Daily Registers
          </CardTitle>

          <div className="flex flex-wrap items-center gap-2">
            {/* Date Picker Input */}
            <div className="flex items-center gap-2">
              <Label htmlFor="regDate" className="sr-only">Date</Label>
              <Input
                id="regDate"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-40 h-9 text-xs rounded-xl"
              />
            </div>

            {/* Search */}
            <div className="relative w-44">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/60" />
              <Input
                placeholder="Search name or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-xs rounded-xl"
              />
            </div>

            {/* Standard Filter */}
            {role === "STUDENT" && (
              <select
                value={standardFilter}
                onChange={(e) => setStandardFilter(e.target.value)}
                className="rounded-xl border border-input bg-background h-9 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary/20 min-w-[120px] cursor-pointer"
              >
                <option value="">All Classes</option>
                {uniqueStandards.map((std, i) => (
                  <option key={i} value={std as string}>{std as string}</option>
                ))}
              </select>
            )}

            {/* Branch Filter */}
            {role === "STUDENT" && (
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="rounded-xl border border-input bg-background h-9 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary/20 min-w-[120px] cursor-pointer"
              >
                <option value="">All Branches</option>
                {uniqueBranches.map((br, i) => (
                  <option key={i} value={br as string}>{br as string}</option>
                ))}
              </select>
            )}

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-input bg-background h-9 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary/20 min-w-[130px] cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Late">Late</option>
              <option value="On Leave">On Leave</option>
              <option value="Half-Day">Half-Day</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : summary.records.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground text-sm font-medium">
              No registered {role.toLowerCase()}s found matching filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/70 text-slate-500 text-xs font-bold border-b tracking-wider uppercase">
                  <tr>
                    <th className="py-3.5 px-4">Bio Code</th>
                    <th className="py-3.5 px-4">Name</th>
                    <th className="py-3.5 px-4">Contact</th>
                    <th className="py-3.5 px-4">{role === "STUDENT" ? "Class" : "Role"}</th>
                    <th className="py-3.5 px-4">Batch Time</th>
                    <th className="py-3.5 px-4">Punch In</th>
                    <th className="py-3.5 px-4">Punch Out</th>
                    <th className="py-3.5 px-4">Source</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {summary.records.map((r, idx) => {
                    return (
                      <tr key={idx} className="hover:bg-muted/10 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-xs">{r.student.code || "—"}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">{r.student.name}</td>
                        <td className="py-3.5 px-4 text-xs text-muted-foreground">{r.student.contact || "—"}</td>
                        <td className="py-3.5 px-4 text-xs">
                          {role === "STUDENT"
                            ? `${r.student.standard} ${r.student.course}`.trim() || "General"
                            : "Faculty"}
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant="outline" className="bg-blue-50/50 border-blue-100 text-blue-700">
                            {r.batch.name}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-700">{r.punchIn || "—"}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-700">{r.punchOut || "—"}</td>
                        <td className="py-3.5 px-4 text-xs text-muted-foreground">
                          <span className={`inline-flex items-center gap-1.5 ${r.manuallyEdited ? "text-amber-600 font-bold" : ""}`}>
                            {r.manuallyEdited ? "Manual" : "Smart Office"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <select
                            value={r.status}
                            onChange={(e) => autoUpdateStatus(r, e.target.value)}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block min-w-16 border cursor-pointer focus:outline-none focus:ring-1 ${
                              r.status === "Present"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 focus:ring-emerald-400"
                                : r.status === "Absent"
                                ? "bg-red-50 text-red-700 border-red-200 focus:ring-red-400"
                                : r.status === "Late"
                                ? "bg-amber-50 text-amber-700 border-amber-200 focus:ring-amber-400"
                                : r.status === "On Leave"
                                ? "bg-indigo-50 text-indigo-700 border-indigo-200 focus:ring-indigo-400"
                                : "bg-orange-50 text-orange-700 border-orange-200 focus:ring-orange-400"
                            }`}
                          >
                            <option value="Present">Present</option>
                            <option value="Absent">Absent</option>
                            <option value="Late">Late</option>
                            <option value="On Leave">On Leave</option>
                            <option value="Half-Day">Half-Day</option>
                          </select>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              onClick={() => openEditModal(r)}
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title="Edit Punch"
                            >
                              <Edit className="h-4.5 w-4.5" />
                            </Button>
                            <Button
                              onClick={() => handleMarkLeave(r)}
                              variant="ghost"
                              size="icon"
                              disabled={r.status === "On Leave"}
                              className="h-7 w-7 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                              title="Mark Leave"
                            >
                              <ShieldAlert className="h-4.5 w-4.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Record Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary animate-spin" /> Adjust Punch Record
            </DialogTitle>
          </DialogHeader>

          {editingRecord && (
            <div className="space-y-4 py-2 text-sm">
              <div className="bg-slate-50 p-3 rounded-xl border space-y-2">
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">User Profile</p>
                <p className="font-bold text-slate-800">{editingRecord.student.name} ({role})</p>
                <div className="flex items-center gap-2 mt-1">
                  <Label htmlFor="adjBioCode" className="text-xs whitespace-nowrap">ID (Bio Code):</Label>
                  <Input
                    id="adjBioCode"
                    type="text"
                    className="h-7 text-xs w-32"
                    value={editBioCode}
                    onChange={(e) => setEditBioCode(e.target.value)}
                    placeholder="e.g. 5001"
                  />
                  <span className="text-xs text-muted-foreground ml-auto">Batch: {editingRecord.batch.name}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="adjStatus">Adjust Status</Label>
                <select
                  id="adjStatus"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as AttendanceRecord["status"])}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/20 cursor-pointer"
                >
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                  <option value="Late">Late</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Half-Day">Half-Day</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="adjPunchIn">Punch In Time</Label>
                  <Input
                    id="adjPunchIn"
                    type="text"
                    placeholder="e.g. 08:30"
                    value={editPunchIn}
                    onChange={(e) => setEditPunchIn(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="adjPunchOut">Punch Out Time</Label>
                  <Input
                    id="adjPunchOut"
                    type="text"
                    placeholder="e.g. 17:00"
                    value={editPunchOut}
                    onChange={(e) => setEditPunchOut(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} className="bg-primary hover:bg-primary/95 text-white">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    <Dialog open={isCustomExportOpen} onOpenChange={setIsCustomExportOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Custom Attendance Export</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex items-center gap-4">
            <div className="space-y-1.5 flex-1">
              <Label>From Date</Label>
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 flex-1">
              <Label>To Date</Label>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Role</Label>
            <div className="flex gap-2">
              <Button
                variant={customRole === "STUDENT" ? "default" : "outline"}
                onClick={() => {
                  setCustomRole("STUDENT");
                  setCustomSelectedUserIds(new Set());
                }}
                className="flex-1"
              >
                Students
              </Button>
              <Button
                variant={customRole === "TEACHER" ? "default" : "outline"}
                onClick={() => {
                  setCustomRole("TEACHER");
                  setCustomSelectedUserIds(new Set());
                }}
                className="flex-1"
              >
                Teachers
              </Button>
            </div>
          </div>

          <div className="space-y-1.5 border rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <Label>Select Specific Users</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-primary"
                onClick={() => {
                  if (customSelectedUserIds.size === customUsersList.length) {
                    setCustomSelectedUserIds(new Set());
                  } else {
                    setCustomSelectedUserIds(new Set(customUsersList.map(u => u.id)));
                  }
                }}
              >
                {customSelectedUserIds.size === customUsersList.length && customUsersList.length > 0 ? "Deselect All" : "Select All"}
              </Button>
            </div>
            <div className="max-h-[200px] overflow-y-auto space-y-2 border-t pt-2">
              {customUsersList.map((user) => (
                <div key={user.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`user-${user.id}`}
                    checked={customSelectedUserIds.has(user.id)}
                    onChange={(e) => {
                      const newSet = new Set(customSelectedUserIds);
                      if (e.target.checked) newSet.add(user.id);
                      else newSet.delete(user.id);
                      setCustomSelectedUserIds(newSet);
                    }}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor={`user-${user.id}`} className="font-normal cursor-pointer text-sm">
                    {user.name} {user.code ? `(${user.code})` : ""}
                  </Label>
                </div>
              ))}
              {customUsersList.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">No users found.</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {customSelectedUserIds.size === 0 
                ? "No specific users selected. Will export ALL users." 
                : `${customSelectedUserIds.size} user(s) selected.`}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsCustomExportOpen(false)}>Cancel</Button>
          <Button onClick={handleExportCustomReport} disabled={customExporting} className="bg-primary hover:bg-primary/95 text-white gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            {customExporting ? "Exporting..." : "Export Custom Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </div>
  );
}
