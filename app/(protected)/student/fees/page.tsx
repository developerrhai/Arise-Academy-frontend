"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentShell } from "@/components/student/StudentShell";
import { ReceiptText, IndianRupee } from "lucide-react";

interface StudentProfile {
  id: number;
  name: string;
  fee: number;
  paid_fee: number;
}

interface Invoice {
  id: number;
  amount: number;
  status: "Paid" | "Unpaid" | "Partial";
  created_at: string;
  due_date?: string;
}

const fmtDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-IN", {
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

export default function StudentFeesPage() {
  const token = useAuthStore((state) => state.token);
  const userRole = useAuthStore((state) => state.user?.role);
  const _hasHydrated = useAuthStore((state) => state._hasHydrated);

  const router = useRouter();

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchFees = useCallback(async () => {
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
      if (!res.ok) throw new Error("Failed to fetch");

      const json = await res.json();
      setProfile(json?.profile);
      setInvoices(json?.invoices || []);
    } catch (err) {
      console.error("Fees fetch failed:", err);
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
    fetchFees();
  }, [mounted, _hasHydrated, token, userRole, router, fetchFees]);

  if (!mounted || !_hasHydrated || loading) {
    return (
      <StudentShell title="Fee Status">
        <div className="rounded-2xl bg-card border border-border/70 p-6 animate-pulse space-y-3">
          <div className="h-4 w-1/3 bg-muted rounded-full" />
          <div className="h-4 w-full bg-muted rounded-full" />
        </div>
      </StudentShell>
    );
  }

  const balance = (profile?.fee ?? 0) - (profile?.paid_fee ?? 0);

  return (
    <StudentShell title="Fee Status">
      <div className="space-y-6">
        {/* Summary Widget */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="rounded-2xl shadow-[var(--shadow-soft)] border border-border/70">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <IndianRupee className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total Fees</p>
                  <p className="text-2xl font-bold">₹{profile?.fee?.toLocaleString("en-IN") ?? "0"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="rounded-2xl shadow-[var(--shadow-soft)] border border-border/70">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                  <IndianRupee className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Amount Paid</p>
                  <p className="text-2xl font-bold text-emerald-600">₹{profile?.paid_fee?.toLocaleString("en-IN") ?? "0"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-[var(--shadow-soft)] border border-border/70">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-full flex items-center justify-center ${balance > 0 ? 'bg-red-100' : 'bg-slate-100'}`}>
                  <IndianRupee className={`h-6 w-6 ${balance > 0 ? 'text-red-600' : 'text-slate-600'}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Balance Due</p>
                  <p className={`text-2xl font-bold ${balance > 0 ? 'text-red-600' : 'text-slate-600'}`}>
                    ₹{balance.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoice List */}
        <Card className="rounded-2xl shadow-[var(--shadow-soft)] border border-border/70 min-h-[40vh]">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <ReceiptText className="h-6 w-6 text-primary" /> Invoice History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {invoices.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-border/50">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">
                    <tr>
                      <th className="py-4 px-4 font-semibold">Date</th>
                      <th className="py-4 px-4 font-semibold">Amount</th>
                      <th className="py-4 px-4 font-semibold">Due Date</th>
                      <th className="py-4 px-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-4 px-4 text-foreground">{fmtDate(inv.created_at)}</td>
                        <td className="py-4 px-4 text-foreground font-semibold">
                          ₹{Number(inv.amount || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="py-4 px-4 text-muted-foreground">
                          {inv.due_date ? fmtDate(inv.due_date) : "—"}
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`text-xs font-semibold px-3 py-1 rounded-full ${
                              inv.status === "Paid"
                                ? "bg-emerald-100 text-emerald-700"
                                : inv.status === "Partial"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState icon={ReceiptText} message="No invoices found." />
            )}
          </CardContent>
        </Card>
      </div>
    </StudentShell>
  );
}
