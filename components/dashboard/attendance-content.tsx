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

  const getHeaders = (): Record<string, string> => {
    const token = getToken();
    return token ? { "Authorization": `Bearer ${token}` } : {};
  };

  // Edit record modal state
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editStatus, setEditStatus] = useState<AttendanceRecord["status"]>("Present");
  const [editPunchIn, setEditPunchIn] = useState("");
  const [editPunchOut, setEditPunchOut] = useState("");
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

  // Open Edit Modal
  const openEditModal = (record: AttendanceRecord) => {
    setEditingRecord(record);
    setEditStatus(record.status);
    setEditPunchIn(record.punchIn || "");
    setEditPunchOut(record.punchOut || "");
    setIsEditOpen(true);
  };

  // Save manual attendance adjustment
  const handleSaveEdit = async () => {
    if (!editingRecord) return;
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
          studentCode: editingRecord.student.code,
          date,
          status: editStatus,
          punchIn: editPunchIn || null,
          punchOut: editPunchOut || null,
          batchId: editingRecord.batch.id,
          role
        })
      });

      if (!res.ok) throw new Error("Failed to record manual adjustment.");

      toast.success("Attendance adjusted successfully!");
      setIsEditOpen(false);
      fetchAttendance();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // WhatsApp broadcast
  const handleNotifyWhatsApp = async () => {
    setNotifying(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://institute-api.rhaitech.online/api";
      const headers = getHeaders();
      const res = await fetch(`${apiBase}/attendance/notify-whatsapp`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ date, role })
      });

      if (!res.ok) throw new Error("Failed to trigger notifications.");

      const json = await res.json();
      toast.success(json.message || "WhatsApp notification loop triggered!");
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
      "Course": r.student.course || "N/A",
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
    return Array.from(new Set(records.map(r => r.student?.course).filter(Boolean))).sort();
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
      const matchBranch = role !== "STUDENT" || !branchFilter || r.student?.course === branchFilter;
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
            <FileSpreadsheet className="h-4 w-4" /> Export Excel
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNotifyWhatsApp}
            disabled={records.length === 0 || notifying}
            className="border-green-500/20 hover:bg-green-50 text-green-700 rounded-xl font-semibold gap-2"
          >
            <MessageSquare className="h-4 w-4" /> Notify Absent
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
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block min-w-16 border ${
                              r.status === "Present"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : r.status === "Absent"
                                ? "bg-red-50 text-red-700 border-red-200"
                                : r.status === "Late"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : r.status === "On Leave"
                                ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                : "bg-orange-50 text-orange-700 border-orange-200"
                            }`}
                          >
                            {r.status}
                          </span>
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
              <div className="bg-slate-50 p-3 rounded-xl border space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">User Profile</p>
                <p className="font-bold text-slate-800">{editingRecord.student.name} ({role})</p>
                <p className="text-xs text-muted-foreground">ID: {editingRecord.student.code || "—"} • Batch: {editingRecord.batch.name}</p>
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
    </div>
  );
}
