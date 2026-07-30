"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useAuthStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentShell } from "@/components/student/StudentShell";
import { studentAttendanceApi } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Calendar,
  CheckCircle,
  AlertTriangle,
  Clock,
  Search,
  UserCheck,
  TrendingUp,
} from "lucide-react";

interface AttendanceRecord {
  date: string;
  punch_in_time: string | null;
  punch_out_time: string | null;
  status: "Present" | "Absent" | "Late" | "Half-Day" | "On Leave";
  source: "Manual" | "Smart Office";
}

const fmtDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "Present":
      return (
        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border border-emerald-200">
          <CheckCircle className="h-3 w-3 mr-1" /> Present
        </Badge>
      );
    case "Late":
      return (
        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border border-amber-200">
          <Clock className="h-3 w-3 mr-1" /> Late
        </Badge>
      );
    case "Half-Day":
      return (
        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border border-blue-200">
          Half-Day
        </Badge>
      );
    case "On Leave":
      return (
        <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border border-purple-200">
          On Leave
        </Badge>
      );
    default:
      return (
        <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border border-red-200">
          <AlertTriangle className="h-3 w-3 mr-1" /> Absent
        </Badge>
      );
  }
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
      <div className="h-16 w-16 rounded-3xl bg-muted/60 grid place-items-center">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <p className="text-lg text-muted-foreground font-medium">{message}</p>
    </div>
  );
}

export default function StudentAttendancePage() {
  const token = useAuthStore((state) => state.token);
  const userRole = useAuthStore((state) => state.user?.role);
  const _hasHydrated = useAuthStore((state) => state._hasHydrated);

  const router = useRouter();

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await studentAttendanceApi.getMyAttendance();
      if (res.success) {
        setRecords(res.data || []);
      }
    } catch (err) {
      console.error("Attendance fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!mounted || !_hasHydrated) return;
    const role = (userRole ?? "").toUpperCase();
    if (!token || role !== "STUDENT") {
      router.push("/student-login");
      return;
    }
    fetchAttendance();
  }, [mounted, _hasHydrated, token, userRole, router, fetchAttendance]);

  // Filtered list
  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return records.filter((r) => {
      const matchesSearch = q.length === 0 || fmtDate(r.date).toLowerCase().includes(q);
      const matchesStatus = filterStatus === "all" || r.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [records, searchTerm, filterStatus]);

  // Statistics calculation
  const stats = useMemo(() => {
    if (records.length === 0) {
      return { total: 0, present: 0, absent: 0, rate: 0 };
    }
    const total = records.length;
    const present = records.filter((r) => r.status === "Present" || r.status === "Late" || r.status === "Half-Day").length;
    const absent = records.filter((r) => r.status === "Absent").length;
    const rate = Math.round((present / total) * 100);

    return { total, present, absent, rate };
  }, [records]);

  if (!mounted || !_hasHydrated || loading) {
    return (
      <StudentShell title="My Attendance">
        <div className="rounded-2xl bg-card border border-border/70 p-6 animate-pulse space-y-3">
          <div className="h-4 w-1/3 bg-muted rounded-full" />
          <div className="h-4 w-full bg-muted rounded-full" />
          <div className="h-4 w-2/3 bg-muted rounded-full" />
        </div>
      </StudentShell>
    );
  }

  return (
    <StudentShell title="My Attendance">
      <div className="space-y-6">
        {/* Statistics Widgets */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-violet-500 to-purple-600">
            <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-bl-[30px]" />
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-violet-100 text-xs font-medium uppercase tracking-wider">Attendance Rate</p>
                <p className="text-3xl font-bold text-white mt-1">{stats.rate}%</p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-teal-600">
            <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-bl-[30px]" />
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-xs font-medium uppercase tracking-wider">Present Days</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {stats.present} <span className="text-sm font-normal text-emerald-100">/ {stats.total} days</span>
                </p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-white" />
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-red-500 to-orange-600">
            <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-bl-[30px]" />
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-xs font-medium uppercase tracking-wider">Absent Days</p>
                <p className="text-3xl font-bold text-white mt-1">{stats.absent} days</p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Attendance List Card */}
        <Card className="rounded-2xl shadow-[var(--shadow-soft)] border border-border/70 min-h-[50vh]">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Calendar className="h-6 w-6 text-primary" /> Attendance Log History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search date..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 rounded-xl"
                />
              </div>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Present">Present</SelectItem>
                  <SelectItem value="Absent">Absent</SelectItem>
                  <SelectItem value="Late">Late</SelectItem>
                  <SelectItem value="Half-Day">Half-Day</SelectItem>
                  <SelectItem value="On Leave">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Attendance Table */}
            {filtered.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-border/50">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">
                    <tr>
                      <th className="py-4 px-4 font-semibold">Date</th>
                      <th className="py-4 px-4 font-semibold">Punch In</th>
                      <th className="py-4 px-4 font-semibold">Punch Out</th>
                      <th className="py-4 px-4 font-semibold text-center">Status</th>
                      <th className="py-4 px-4 font-semibold text-center">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-4 px-4 text-foreground font-medium">{fmtDate(r.date)}</td>
                        <td className="py-4 px-4 text-slate-600 font-medium">
                          {r.punch_in_time ? r.punch_in_time : "—"}
                        </td>
                        <td className="py-4 px-4 text-slate-600 font-medium">
                          {r.punch_out_time ? r.punch_out_time : "—"}
                        </td>
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="py-4 px-4 text-center text-xs text-muted-foreground whitespace-nowrap">
                          <Badge variant="secondary" className="px-2 py-0.5 rounded-md text-[10px]">
                            {r.source}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState icon={Calendar} message="No attendance records found." />
            )}
          </CardContent>
        </Card>
      </div>
    </StudentShell>
  );
}
