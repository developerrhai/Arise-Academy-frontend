"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardShell } from "@/components/teacher/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Calendar, BookOpen, FileText } from "lucide-react";
import { teachingLogsApi } from "@/lib/api";

const SUBJECTS = ["Math", "Science", "English", "SST", "Physics", "Chemistry", "Biology"];
const BATCHES = [
  "1st Standard CBSE", "2nd Standard CBSE", "3rd Standard CBSE", "4th Standard CBSE", "5th Standard CBSE",
  "6th Standard CBSE", "7th Standard CBSE", "8th Standard CBSE", "9th Standard CBSE", "10th Standard CBSE",
  "11th Standard CBSE", "12th Standard CBSE", "10th Standard State", "12th Standard State"
];

export default function TeachingLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Log Dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newLog, setNewLog] = useState({
    date: new Date().toISOString().split("T")[0],
    subject: "",
    topicCovered: "",
    batch: "",
    notes: ""
  });
  const [saving, setSaving] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await teachingLogsApi.getTeacherLogs();
      setLogs(res.data || []);
    } catch (e) {
      console.error("Failed to fetch teaching logs", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleCreateLog = async () => {
    if (!newLog.date || !newLog.subject || !newLog.topicCovered || !newLog.batch) {
      alert("Please fill in all required fields.");
      return;
    }
    setSaving(true);
    try {
      await teachingLogsApi.create(newLog);
      setCreateOpen(false);
      setNewLog({
        date: new Date().toISOString().split("T")[0],
        subject: "",
        topicCovered: "",
        batch: "",
        notes: ""
      });
      fetchLogs();
    } catch (e: any) {
      alert(e.message || "Failed to save log");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardShell title="Teaching Logs">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Teacher's Daily Diary</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Keep track of lessons and chapters completed in each class.</p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="bg-primary hover:bg-primary/95 text-white">
            <Plus className="h-4 w-4 mr-2" /> Log Daily Class
          </Button>
        </div>

        {/* List of logged classes */}
        <Card className="shadow-sm border-border/60">
          <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Previous Logs</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">No teaching logs recorded yet.</div>
            ) : (
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Date</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Topic Taught</TableHead>
                      <TableHead>Remarks / Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id} className="hover:bg-muted/30">
                        <TableCell className="font-semibold text-slate-700 whitespace-nowrap">
                          {new Date(log.class_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell><Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100">{log.batch}</Badge></TableCell>
                        <TableCell className="font-semibold text-slate-800">{log.subject}</TableCell>
                        <TableCell className="font-medium text-slate-700">{log.topic}</TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate" title={log.notes}>
                          {log.notes || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* CREATE LOG DIALOG */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Record Teaching Log</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="date">Class Date <span className="text-destructive">*</span></Label>
                <Input id="date" type="date" value={newLog.date} onChange={e => setNewLog({...newLog, date: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="batch">Batch / Class <span className="text-destructive">*</span></Label>
                <select id="batch" value={newLog.batch} onChange={e => setNewLog({...newLog, batch: e.target.value})}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="">Select Batch</option>
                  {BATCHES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="subject">Subject <span className="text-destructive">*</span></Label>
                <select id="subject" value={newLog.subject} onChange={e => setNewLog({...newLog, subject: e.target.value})}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="">Select Subject</option>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="topic">Topic Covered <span className="text-destructive">*</span></Label>
                <Input id="topic" value={newLog.topicCovered} onChange={e => setNewLog({...newLog, topicCovered: e.target.value})} placeholder="e.g. Chapter 4 Integration" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Remarks / Specific Student Observations</Label>
              <Textarea id="notes" value={newLog.notes} onChange={e => setNewLog({...newLog, notes: e.target.value})} placeholder="e.g. Completed theory, needs practical next class..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateLog} disabled={saving} className="bg-primary hover:bg-primary/95 text-white">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save Log
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
