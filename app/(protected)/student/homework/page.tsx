"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentShell } from "@/components/student/StudentShell";
import { homeworkApi } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  User,
  Eye,
  FileText,
  CheckCircle,
  AlertTriangle,
  BookOpen,
} from "lucide-react";

/* ── Types ─────────────────────────────────────────────────── */
interface Homework {
  id: number;
  title: string;
  subject: string;
  due_date: string;
  description?: string;
  attachment_url?: string;
  status?: string;
  teacher_name?: string;
  feedback?: string;
}

const fmtDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

function StatusBadge({ status }: { status?: string }) {
  switch (status) {
    case "Completed":
      return (
        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border border-emerald-200">
          <CheckCircle className="h-3 w-3 mr-1" /> Completed
        </Badge>
      );
    case "Late":
      return (
        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border border-amber-200">
          <AlertTriangle className="h-3 w-3 mr-1" /> Late
        </Badge>
      );
    case "Overdue":
      return (
        <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border border-red-200 animate-pulse">
          <AlertTriangle className="h-3 w-3 mr-1" /> Overdue
        </Badge>
      );
    default:
      return (
        <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 border border-slate-200">
          Pending
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

export default function StudentHomeworkPage() {
  const token = useAuthStore((state) => state.token);
  const userRole = useAuthStore((state) => state.user?.role);
  const _hasHydrated = useAuthStore((state) => state._hasHydrated);

  const router = useRouter();

  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const [selectedHomework, setSelectedHomework] = useState<Homework | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchHomeworks = useCallback(async () => {
    setLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://institute-api.rhaitech.online/api";
      const res = await fetch(`${apiBase}/dashboard/student`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        router.replace("/student-login");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch profile");

      const json = await res.json();
      const profile = json?.profile;
      const batchName = `${profile?.standard ?? ""} ${profile?.course ?? ""}`.trim();

      if (batchName) {
        const hwData = await homeworkApi.getByBatch(batchName);
        const hwList = Array.isArray(hwData) ? hwData : (hwData as any)?.homeworks ?? (hwData as any)?.data ?? [];
        setHomeworks(hwList);
      }
    } catch (err) {
      console.error("Homework fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }, [token, router]);

  useEffect(() => {
    if (!mounted || !_hasHydrated) return;
    const role = (userRole ?? "").toUpperCase();
    if (!token || role !== "STUDENT") {
      router.push("/student-login");
      return;
    }
    fetchHomeworks();
  }, [mounted, _hasHydrated, token, userRole, router, fetchHomeworks]);

  if (!mounted || !_hasHydrated || loading) {
    return (
      <StudentShell title="My Homework">
        <div className="rounded-2xl bg-card border border-border/70 p-6 animate-pulse space-y-3">
          <div className="h-4 w-1/3 bg-muted rounded-full" />
          <div className="h-4 w-full bg-muted rounded-full" />
          <div className="h-4 w-2/3 bg-muted rounded-full" />
        </div>
      </StudentShell>
    );
  }

  return (
    <StudentShell title="My Homework">
      <Card className="rounded-2xl shadow-[var(--shadow-soft)] border border-border/70 min-h-[60vh]">
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" /> All Assignments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {homeworks.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-border/50">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">
                  <tr>
                    <th className="py-4 px-4 font-semibold">Subject</th>
                    <th className="py-4 px-4 font-semibold">Title</th>
                    <th className="py-4 px-4 font-semibold">Due Date</th>
                    <th className="py-4 px-4 font-semibold text-center">Status</th>
                    <th className="py-4 px-4 font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {homeworks.map((hw) => (
                    <tr
                      key={hw.id}
                      className={`border-b last:border-0 transition-colors ${
                        hw.status === "Overdue" ? "bg-red-50/60 hover:bg-red-50" : "hover:bg-muted/30"
                      }`}
                    >
                      <td className="py-4 px-4 font-medium text-foreground">{hw.subject}</td>
                      <td className="py-4 px-4 text-foreground font-semibold">{hw.title}</td>
                      <td className="py-4 px-4 text-muted-foreground whitespace-nowrap">
                        {fmtDate(hw.due_date)}
                      </td>
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <StatusBadge status={hw.status} />
                      </td>
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => {
                            setSelectedHomework(hw);
                            setModalOpen(true);
                          }}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        >
                          <Eye className="h-4 w-4" /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={BookOpen} message="No homework assignments found." />
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold border-b pb-3">
              <FileText className="h-5 w-5 text-primary" /> Assignment Details
            </DialogTitle>
          </DialogHeader>
          {selectedHomework && (
            <div className="space-y-5 py-2 text-sm">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className="font-semibold text-lg text-foreground">{selectedHomework.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Subject: <span className="font-medium text-foreground">{selectedHomework.subject}</span>
                  </p>
                </div>
                <StatusBadge status={selectedHomework.status} />
              </div>
              {selectedHomework.description && (
                <div className="bg-muted/40 rounded-xl p-4 border space-y-2">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Instructions</p>
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">{selectedHomework.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Due Date</p>
                    <p className="font-medium text-sm">{fmtDate(selectedHomework.due_date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Assigned By</p>
                    <p className="font-medium text-sm">{selectedHomework.teacher_name ?? "Teacher"}</p>
                  </div>
                </div>
              </div>
              {selectedHomework.attachment_url && (
                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/20">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="font-medium text-sm text-primary">Attachment File</span>
                  </div>
                  <a
                    href={selectedHomework.attachment_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm bg-primary text-primary-foreground font-medium px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Download
                  </a>
                </div>
              )}
              {selectedHomework.feedback && (
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-sm text-emerald-800 font-semibold">
                    <CheckCircle className="h-5 w-5" /> Teacher Feedback
                  </div>
                  <p className="text-emerald-700 text-sm leading-relaxed">{selectedHomework.feedback}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </StudentShell>
  );
}
