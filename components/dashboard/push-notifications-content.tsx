"use client";

import { useState, useEffect } from "react";
import { Bell, BellRing, Send, RefreshCw, CheckCircle2, AlertCircle, Users, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notificationsApi } from "@/lib/api";
import { toast } from "sonner";

interface NotificationHistoryItem {
  id: number;
  public_id: string;
  title: string;
  body: string;
  target_type: "single" | "bulk" | "filtered";
  target_role: string;
  target_criteria?: any;
  sent_by_name?: string;
  success_count: number;
  failure_count: number;
  status: "pending" | "sent" | "failed";
  created_at: string;
}

export function PushNotificationsContent() {
  const [targetType, setTargetType] = useState<"bulk" | "single">("bulk");
  const [targetRole, setTargetRole] = useState<"STUDENT" | "TEACHER" | "ADMIN">("STUDENT");
  const [targetId, setTargetId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  const [history, setHistory] = useState<NotificationHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await notificationsApi.getHistory(50, 0);
      if (res.success && Array.isArray(res.data)) {
        setHistory(res.data);
      }
    } catch (err: any) {
      console.error("Failed to fetch notification history:", err);
      toast.error(err.message || "Failed to load notification history");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      return toast.error("Please provide both headline title and body message.");
    }

    if (targetType === "single" && !targetId.trim()) {
      return toast.error("Please enter a valid target user ID.");
    }

    setLoading(true);
    try {
      let res;
      if (targetType === "single") {
        res = await notificationsApi.sendSingle({
          userId: targetId.trim(),
          userRole: targetRole,
          title: title.trim(),
          body: body.trim(),
        });
      } else {
        res = await notificationsApi.sendBulk({
          targetRole,
          title: title.trim(),
          body: body.trim(),
        });
      }

      if (res.success) {
        toast.success(res.message || "Push notification broadcast transmitted successfully!");
        setTitle("");
        setBody("");
        setTargetId("");
        fetchHistory();
      } else {
        toast.error(res.message || "Push transmission failed");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "An error occurred while sending push alert.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border/70 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
            <BellRing className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Global Push Notifications Matrix</h2>
            <p className="text-sm text-muted-foreground">
              Broadcast real-time push notification alerts directly to active student & teacher devices.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={fetchHistory}
          disabled={historyLoading}
          className="gap-2 shrink-0 self-start md:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${historyLoading ? "animate-spin" : ""}`} />
          Refresh Logs
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compose Push Form */}
        <div className="lg:col-span-1 bg-card p-6 rounded-2xl border border-border/70 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Send className="h-5 w-5 text-amber-500" />
            <h3 className="font-semibold text-lg">Compose Push Alert</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Target Type
              </label>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value as "bulk" | "single")}
                className="w-full bg-accent/50 border border-border rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                <option value="bulk">Bulk Audience Broadcast</option>
                <option value="single">Single Specific User</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Target Audience Role
              </label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value as "STUDENT" | "TEACHER" | "ADMIN")}
                className="w-full bg-accent/50 border border-border rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                <option value="STUDENT">All Active Students</option>
                <option value="TEACHER">All Teachers</option>
                <option value="ADMIN">Admins</option>
              </select>
            </div>

            {targetType === "single" && (
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                  Target User ID
                </label>
                <input
                  type="text"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  placeholder="Enter User ID (e.g. 15)"
                  className="w-full bg-accent/50 border border-border rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Alert Headline Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Urgent Exam Notice"
                className="w-full bg-accent/50 border border-border rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Message Body Content
              </label>
              <textarea
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Detailed message content to display on device screen..."
                className="w-full bg-accent/50 border border-border rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-900 font-bold shadow-md rounded-xl"
            >
              <Send className="h-4 w-4" />
              {loading ? "Transmitting..." : "Transmit Push Alert"}
            </Button>
          </form>
        </div>

        {/* History Table */}
        <div className="lg:col-span-2 bg-card p-6 rounded-2xl border border-border/70 shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-500" />
              Push Broadcast Audit Logs
            </h3>
            <span className="text-xs text-muted-foreground bg-accent px-2.5 py-1 rounded-full font-medium">
              {history.length} Entries
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            {historyLoading ? (
              <div className="flex justify-center items-center py-12 text-muted-foreground text-sm gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-amber-500" />
                Loading history logs...
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No push notifications have been transmitted yet.
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-xs uppercase font-semibold text-muted-foreground">
                    <th className="py-2.5 px-3">Title & Body</th>
                    <th className="py-2.5 px-3">Target</th>
                    <th className="py-2.5 px-3">Delivery Stats</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Date & Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-accent/30 transition-colors">
                      <td className="py-3 px-3">
                        <p className="font-semibold text-foreground line-clamp-1">{item.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{item.body}</p>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs font-medium">
                          {item.target_type === "bulk" ? (
                            <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-md">
                              <Users className="h-3 w-3" /> Bulk ({item.target_role})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md">
                              <User className="h-3 w-3" /> Single ({item.target_role})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-xs">
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          ✓ {item.success_count}
                        </span>
                        {" / "}
                        <span className="text-rose-500 font-semibold">
                          ✗ {item.failure_count}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {item.status === "sent" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                            <CheckCircle2 className="h-3 w-3" /> Sent
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md">
                            <AlertCircle className="h-3 w-3" /> Failed
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
