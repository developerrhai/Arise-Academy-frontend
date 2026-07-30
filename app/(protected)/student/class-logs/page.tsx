"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentShell } from "@/components/student/StudentShell";
import { ClipboardList } from "lucide-react";

interface ClassUpdate {
  id: number;
  class_date: string;
  class_time?: string;
  subject: string;
  chapter?: string;
  topic: string;
}

const fmtDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

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

export default function StudentClassLogsPage() {
  const token = useAuthStore((state) => state.token);
  const userRole = useAuthStore((state) => state.user?.role);
  const _hasHydrated = useAuthStore((state) => state._hasHydrated);

  const router = useRouter();
  const [classUpdates, setClassUpdates] = useState<ClassUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const limit = 10;

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchLogs = useCallback(async (pageNum: number, append = false) => {
    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://institute-api.rhaitech.online/api";
      const res = await fetch(`${apiBase}/dashboard/student?page=${pageNum}&limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        router.replace("/student-login");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch");

      const json = await res.json();
      const logs = json?.classUpdates || [];
      setTotal(json?.classUpdatesTotal || 0);

      if (append) {
        setClassUpdates((prev) => [...prev, ...logs]);
      } else {
        setClassUpdates(logs);
      }
    } catch (err) {
      console.error("Class logs fetch failed:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [token, router]);

  useEffect(() => {
    if (!mounted || !_hasHydrated) return;
    const role = (userRole ?? "").toUpperCase();
    if (!token || role !== "STUDENT") {
      router.push("/student-login");
      return;
    }
    fetchLogs(1, false);
    setPage(1);
  }, [mounted, _hasHydrated, token, userRole, router, fetchLogs]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchLogs(nextPage, true);
  };

  const hasMore = classUpdates.length < total;

  if (!mounted || !_hasHydrated || (loading && page === 1)) {
    return (
      <StudentShell title="Class Logs">
        <div className="rounded-2xl bg-card border border-border/70 p-6 animate-pulse space-y-3">
          <div className="h-4 w-1/3 bg-muted rounded-full" />
          <div className="h-4 w-full bg-muted rounded-full" />
        </div>
      </StudentShell>
    );
  }

  return (
    <StudentShell title="Class Logs">
      <div className="space-y-6">
        <Card className="rounded-2xl shadow-[var(--shadow-soft)] border border-border/70">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-primary" /> Class History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {classUpdates.length > 0 ? (
              <>
                <div className="overflow-x-auto rounded-xl border border-border/50">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">
                      <tr>
                        <th className="py-4 px-4 font-semibold">Date & Time</th>
                        <th className="py-4 px-4 font-semibold">Subject</th>
                        <th className="py-4 px-4 font-semibold">Chapter</th>
                        <th className="py-4 px-4 font-semibold">Topic Covered</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classUpdates.map((update) => (
                        <tr key={update.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="py-4 px-4 whitespace-nowrap text-muted-foreground">
                            <span className="font-medium text-foreground block">{fmtDate(update.class_date)}</span>
                            {update.class_time && (
                              <span className="text-xs opacity-80">{update.class_time}</span>
                            )}
                          </td>
                          <td className="py-4 px-4 font-semibold text-foreground">
                            {update.subject}
                          </td>
                          <td className="py-4 px-4 text-muted-foreground">
                            {update.chapter ?? "—"}
                          </td>
                          <td className="py-4 px-4 text-foreground">
                            {update.topic}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {hasMore && (
                  <div className="flex justify-center pt-4">
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="px-6 py-2 text-sm font-medium border border-border hover:bg-muted bg-white text-foreground rounded-xl transition-all duration-200 shadow-sm disabled:opacity-50"
                    >
                      {loadingMore ? "Loading..." : "Load More"}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <EmptyState icon={ClipboardList} message="No class updates found yet." />
            )}
          </CardContent>
        </Card>
      </div>
    </StudentShell>
  );
}
