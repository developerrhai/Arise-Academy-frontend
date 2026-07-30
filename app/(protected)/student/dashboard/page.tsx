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
  ReceiptText,
  RefreshCw,
  ClipboardList,
  GraduationCap,
  IndianRupee,
} from "lucide-react";

/* ── Types ─────────────────────────────────────────────────── */
interface StudentProfile {
  id: number;
  name: string;
  email: string;
  phone?: string;
  course: string;
  standard: string;
  board: string;
  fee: number;
  paid_fee: number;
}

interface Invoice {
  id: number;
  amount: number;
  status: "Paid" | "Unpaid" | "Partial";
  created_at: string;
}

interface ClassUpdate {
  id: number;
  class_date: string;
  class_time?: string;
  subject: string;
  chapter?: string;
  topic: string;
  batch?: string;
}

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

interface DashboardData {
  profile: StudentProfile;
  invoices: Invoice[];
  classUpdates: ClassUpdate[];
}

/* ── Helpers ────────────────────────────────────────────────── */
/** Formats a date string to locale short format */
const fmtDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

/* ── Status Badge ───────────────────────────────────────────── */
function StatusBadge({ status }: { status?: string }) {
  // Use the exact status provided by the backend to ensure logic parity
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

/* ── Skeleton Loader ────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-card border border-border/70 p-6 animate-pulse space-y-3">
      <div className="h-4 w-1/3 bg-muted rounded-full" />
      <div className="h-3 w-2/3 bg-muted rounded-full" />
      <div className="h-3 w-1/2 bg-muted rounded-full" />
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr>
      {[1, 2, 3, 4].map((i) => (
        <td key={i} className="py-3 px-3">
          <div className="h-3 bg-muted rounded-full animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

/* ── Empty State ────────────────────────────────────────────── */
function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
      <div className="h-14 w-14 rounded-2xl bg-muted/60 grid place-items-center">
        <Icon className="h-7 w-7 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground font-medium">{message}</p>
    </div>
  );
}

/* ── Error State ────────────────────────────────────────────── */
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
      <div className="h-14 w-14 rounded-2xl bg-destructive/10 grid place-items-center">
        <AlertTriangle className="h-7 w-7 text-destructive" />
      </div>
      <div>
        <p className="font-semibold text-foreground">Failed to load dashboard</p>
        <p className="text-sm text-muted-foreground mt-1">
          Could not connect to the server. Check your network and try again.
        </p>
      </div>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-[var(--shadow-soft)]"
      >
        <RefreshCw className="h-4 w-4" /> Retry
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
export default function StudentDashboard() {
  const token = useAuthStore((state) => state.token);
  const userRole = useAuthStore((state) => state.user?.role);
  const userName = useAuthStore((state) => state.user?.name);
  const _hasHydrated = useAuthStore((state) => state._hasHydrated);

  const router = useRouter();

  const [data, setData] = useState<DashboardData | null>(null);
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [selectedHomework, setSelectedHomework] = useState<Homework | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Prevent SSR/hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  /** Fetches both dashboard summary and the student's homework */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      // Use the centralized API base URL from lib/api.ts (NEXT_PUBLIC_API_URL)
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://institute-api.rhaitech.online/api";

      const res = await fetch(`${apiBase}/dashboard/student`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Handle 401 — session expired: redirect to login
      if (res.status === 401) {
        router.replace("/student-login");
        return;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json: DashboardData = await res.json();
      setData(json);

      // Build batch name securely using optional chaining
      const profile = json?.profile;
      const batchName = `${profile?.standard ?? ""} ${profile?.course ?? ""}`.trim();

      if (batchName) {
        try {
          // homeworkApi.getByBatch returns the full response object from lib/api.ts
          const hwData = await homeworkApi.getByBatch(batchName);
          // Handle arrays directly and extract inner data gracefully
          const hwList: Homework[] = Array.isArray(hwData)
            ? hwData
            : (hwData as any)?.homeworks ?? (hwData as any)?.data ?? [];
          setHomeworks(hwList);
        } catch (hwErr) {
          // Homework fetch failing shouldn't crash the whole dashboard
          console.warn("Homework fetch failed (non-critical):", hwErr);
          setHomeworks([]);
        }
      }
    } catch (err) {
      console.error("Dashboard fetch failed:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [token, router]);

  // Wait for hydration + mount before running auth check or fetch
  useEffect(() => {
    if (!mounted || !_hasHydrated) return;

    const role = (userRole ?? "").toUpperCase();
    if (!token || role !== "STUDENT") {
      router.push("/student-login");
      return;
    }

    fetchAll();
  }, [mounted, _hasHydrated, token, userRole, router, fetchAll]);

  /* ── Loading State ──────────────────────────────────────── */
  if (!mounted || !_hasHydrated || loading) {
    return (
      <StudentShell title="Student Dashboard">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </StudentShell>
    );
  }

  /* ── Error State ────────────────────────────────────────── */
  if (error) {
    return (
      <StudentShell title="Student Dashboard">
        <ErrorState onRetry={fetchAll} />
      </StudentShell>
    );
  }

  const profile = data?.profile;
  const balance = (profile?.fee ?? 0) - (profile?.paid_fee ?? 0);
  const pageTitle = `Welcome back, ${profile?.name ?? userName ?? "Student"} 👋`;

  /* ── Edge case: student has no class assigned ───────────── */
  const hasNoClass = !profile?.standard && !profile?.course;

  return (
    <StudentShell title={pageTitle}>
      <div className="space-y-8">

        {/* No-class warning banner */}
        {hasNoClass && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">
              You are not assigned to any class yet. Please contact the admin to get assigned.
            </p>
          </div>
        )}

        {/* ── HERO SECTION ────────────────────────────────── */}
        <section
          className="rounded-2xl p-8 md:p-12 text-primary-foreground relative overflow-hidden shadow-[var(--shadow-elegant)] border border-white/20"
          style={{ background: "var(--gradient-primary)" }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,.18),transparent_45%)]" />
          <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-medium bg-white/15 backdrop-blur px-4 py-1.5 rounded-full border border-white/20">
              <GraduationCap className="h-3.5 w-3.5" /> Student Dashboard
            </div>
            <h2 className="text-3xl md:text-4xl font-bold leading-tight mt-2">
              {profile?.name ?? userName ?? "Welcome!"}
            </h2>
            <p className="text-primary-foreground/80 text-base">
              {profile?.standard} {profile?.course} • {profile?.board}
            </p>
          </div>
        </section>

        {/* ── STAT CARDS ───────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Profile Info */}
          <Card className="rounded-2xl shadow-[var(--shadow-soft)] border border-border/70 hover:-translate-y-0.5 hover:shadow-[var(--shadow-elegant)] transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-primary" /> Profile Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Course</span>
                <span className="font-medium">{profile?.course || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Standard</span>
                <span className="font-medium">{profile?.standard || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Board</span>
                <span className="font-medium">{profile?.board || "—"}</span>
              </div>
            </CardContent>
          </Card>

          {/* Fee Summary */}
          <Card className="rounded-2xl shadow-[var(--shadow-soft)] border border-border/70 hover:-translate-y-0.5 hover:shadow-[var(--shadow-elegant)] transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-primary" /> Fee Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Fee</span>
                <span className="font-medium">₹{profile?.fee?.toLocaleString("en-IN") ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paid</span>
                <span className="font-medium text-emerald-600">
                  ₹{profile?.paid_fee?.toLocaleString("en-IN") ?? "—"}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-semibold">Balance Due</span>
                <span
                  className={`font-bold ${
                    balance > 0 ? "text-red-600" : "text-emerald-600"
                  }`}
                >
                  ₹{balance.toLocaleString("en-IN")}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Invoices */}
          <Card className="rounded-2xl shadow-[var(--shadow-soft)] border border-border/70 hover:-translate-y-0.5 hover:shadow-[var(--shadow-elegant)] transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <ReceiptText className="h-4 w-4 text-primary" /> Invoices
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(data?.invoices?.length ?? 0) > 0 ? (
                <ul className="space-y-2">
                  {data?.invoices?.map((inv) => (
                    <li
                      key={inv.id}
                      className="flex justify-between items-center text-sm border-b last:border-0 pb-1.5"
                    >
                      <span className="text-muted-foreground">
                        ₹{Number(inv.amount || 0).toLocaleString("en-IN")}
                      </span>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          inv.status === "Paid"
                            ? "bg-emerald-100 text-emerald-700"
                            : inv.status === "Partial"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={ReceiptText} message="No invoices found." />
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── FEED GRID ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Recent Class Updates */}
          <Card className="rounded-2xl shadow-[var(--shadow-soft)] border border-border/70">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" /> Recent Class Updates
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(data?.classUpdates?.length ?? 0) > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-border/50">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Subject</th>
                        <th className="py-2.5 px-3">Chapter</th>
                        <th className="py-2.5 px-3">Topic</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.classUpdates?.map((update) => (
                        <tr
                          key={update.id}
                          className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                        >
                          <td className="py-3 px-3 whitespace-nowrap text-muted-foreground text-xs">
                            {fmtDate(update.class_date)}
                            {update.class_time && (
                              <span className="ml-1 opacity-60">{update.class_time}</span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-medium text-foreground">
                            {update.subject}
                          </td>
                          <td className="py-3 px-3 text-muted-foreground">
                            {update.chapter ?? "—"}
                          </td>
                          <td className="py-3 px-3 text-foreground">{update.topic}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState icon={ClipboardList} message="No class updates found yet." />
              )}
            </CardContent>
          </Card>

          {/* Homework Assignments */}
          <Card className="rounded-2xl shadow-[var(--shadow-soft)] border border-border/70">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" /> My Homework Assignments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {homeworks.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-border/50">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Subject</th>
                        <th className="py-2.5 px-3">Title</th>
                        <th className="py-2.5 px-3">Due</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-center">View</th>
                      </tr>
                    </thead>
                    <tbody>
                      {homeworks.map((hw) => {
                        return (
                          <tr
                            key={hw.id}
                            className={`border-b last:border-0 transition-colors ${
                              hw.status === "Overdue"
                                ? "bg-red-50/60 hover:bg-red-50"
                                : "hover:bg-muted/30"
                            }`}
                          >
                            <td className="py-3 px-3 font-medium text-foreground">
                              {hw.subject}
                            </td>
                            <td className="py-3 px-3 truncate max-w-[100px] text-foreground">
                              {hw.title}
                            </td>
                            <td className="py-3 px-3 text-muted-foreground whitespace-nowrap text-xs">
                              {fmtDate(hw.due_date)}
                            </td>
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <StatusBadge
                                status={hw.status}
                              />
                            </td>
                            <td className="py-3 px-3 text-center">
                              <button
                                onClick={() => {
                                  setSelectedHomework(hw);
                                  setModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                                aria-label={`View details for ${hw.title}`}
                              >
                                <Eye className="h-3.5 w-3.5" /> Details
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState icon={BookOpen} message="No homework assignments found." />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Homework Details Modal ─────────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold border-b pb-3">
              <FileText className="h-5 w-5 text-primary" /> Assignment Details
            </DialogTitle>
          </DialogHeader>

          {selectedHomework && (
            <div className="space-y-4 py-2 text-sm">
              {/* Title + Status */}
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className="font-semibold text-base text-foreground">
                    {selectedHomework.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Subject:{" "}
                    <span className="font-medium text-foreground">
                      {selectedHomework.subject}
                    </span>
                  </p>
                </div>
                <StatusBadge
                  status={selectedHomework.status}
                />
              </div>

              {/* Description */}
              {selectedHomework.description && (
                <div className="bg-muted/40 rounded-xl p-3 border space-y-1.5">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                    Instructions
                  </p>
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                    {selectedHomework.description}
                  </p>
                </div>
              )}

              {/* Metadata grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-2.5 bg-muted/30 rounded-xl border">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Due Date</p>
                    <p className="font-medium text-xs">{fmtDate(selectedHomework.due_date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-muted/30 rounded-xl border">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Assigned By</p>
                    <p className="font-medium text-xs">
                      {selectedHomework.teacher_name ?? "Teacher"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Attachment download */}
              {selectedHomework.attachment_url && (
                <div className="flex items-center justify-between p-3 bg-primary/5 rounded-xl border border-primary/20">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="font-medium text-xs text-primary truncate max-w-[180px]">
                      Attachment File
                    </span>
                  </div>
                  <a
                    href={selectedHomework.attachment_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs bg-primary text-primary-foreground font-medium px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Download
                  </a>
                </div>
              )}

              {/* Teacher feedback */}
              {selectedHomework.feedback && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-semibold">
                    <CheckCircle className="h-4 w-4" /> Teacher Feedback
                  </div>
                  <p className="text-emerald-700 text-xs leading-relaxed">
                    {selectedHomework.feedback}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </StudentShell>
  );
}
