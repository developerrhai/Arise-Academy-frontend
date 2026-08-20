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
import { Loader2, Plus, Pencil, Trash2, Users, CheckCircle, Clock, FileText, Upload } from "lucide-react";
import { homeworkApi, studentsApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";

const SUBJECTS = ["Math", "Science", "English", "SST", "Physics", "Chemistry", "Biology"];
const BATCHES = [
  "1st Standard CBSE", "2nd Standard CBSE", "3rd Standard CBSE", "4th Standard CBSE", "5th Standard CBSE",
  "6th Standard CBSE", "7th Standard CBSE", "8th Standard CBSE", "9th Standard CBSE", "10th Standard CBSE",
  "11th Standard CBSE", "12th Standard CBSE", "10th Standard State", "12th Standard State"
];
const BRANCHES = ["Akurdi", "Bijaliinagar", "Walhekarwadi"];
const BOARDS = ["State Board", "CBSE", "ICSE", "IB"];
const STANDARDS = [
  "1st Standard", "2nd Standard", "3rd Standard", "4th Standard", "5th Standard",
  "6th Standard", "7th Standard", "8th Standard", "9th Standard", "10th Standard",
  "11th Standard", "12th Standard"
];

export default function HomeworkPage() {
  const [homeworks, setHomeworks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Modal
  const [createOpen, setCreateOpen] = useState(false);
  const [newHw, setNewHw] = useState({
    chapter: "", topic: "", subject: "", branch: "", board: "", standard: "", dueDate: "", description: "", attachmentUrl: ""
  });
  });
  const [saving, setSaving] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  // Edit Modal
  const [editOpen, setEditOpen] = useState(false);
  const [editHw, setEditHw] = useState<any>(null);

  // Track Modal
  const [trackOpen, setTrackOpen] = useState(false);
  const [trackHw, setTrackHw] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [studentStatuses, setStudentStatuses] = useState<Record<number, { status: string; feedback: string }>>({});
  const [trackingSaving, setTrackingSaving] = useState(false);

  const fetchHomeworks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await homeworkApi.getTeacherHomework();
      setHomeworks(res.data || []);
    } catch (e) {
      console.error("Failed to load homeworks", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHomeworks();
  }, [fetchHomeworks]);

  // Handle File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAttachment(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = useAuthStore.getState().token;
      // Use standard fetch to the new API endpoint
      const res = await fetch("https://institute-api.rhaitech.online/arise/api/homework-attachments/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData,
      });

      const json = await res.json();
      if (json.success && json.data?.url) {
        if (isEdit) {
          setEditHw({ ...editHw, attachment_url: json.data.url });
        } else {
          setNewHw({ ...newHw, attachmentUrl: json.data.url });
        }
      } else {
        alert(json.message || "File upload failed");
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("An error occurred while uploading the file.");
    } finally {
      setUploadingAttachment(false);
      if (e.target) e.target.value = ''; // Reset input
    }
  };

  // Handle Homework Assignment
  const handleAssign = async () => {
    if (!newHw.chapter || !newHw.topic || !newHw.subject || !newHw.branch || !newHw.standard || !newHw.dueDate) {
      alert("Please fill in all required fields.");
      return;
    }
    setSaving(true);
    try {
      await homeworkApi.create(newHw);
      setCreateOpen(false);
      setNewHw({ chapter: "", topic: "", subject: "", branch: "", board: "", standard: "", dueDate: "", description: "", attachmentUrl: "" });
      fetchHomeworks();
    } catch (err: any) {
      alert(err.message || "Failed to assign homework");
    } finally {
      setSaving(false);
    }
  };

  // Handle Edit Homework
  const handleEdit = async () => {
    if (!editHw.title || !editHw.due_date) {
      alert("Please fill in all required fields.");
      return;
    }
    setSaving(true);
    try {
      await homeworkApi.edit(editHw.id, {
        title: editHw.title,
        description: editHw.description,
        dueDate: editHw.due_date,
        attachmentUrl: editHw.attachment_url
      });
      setEditOpen(false);
      fetchHomeworks();
    } catch (err: any) {
      alert(err.message || "Failed to update homework");
    } finally {
      setSaving(false);
    }
  };

  // Open Track Modal and Load Students
  const openTrackModal = async (hw: any) => {
    setTrackHw(hw);
    setTrackOpen(true);
    setLoadingStudents(true);
    setSelectedStudents([]);
    try {
      const res = await homeworkApi.getHomeworkStudents(hw.id);
      const activeStudents = res.data || [];
      setStudents(activeStudents);
      
      const initialStatuses: Record<number, { status: string; feedback: string }> = {};
      activeStudents.forEach((student: any) => {
        initialStatuses[student.id] = { 
          status: student.status || "Pending", 
          feedback: student.feedback || "" 
        };
      });
      setStudentStatuses(initialStatuses);
    } catch (e) {
      console.error("Failed to load students for grading:", e);
    } finally {
      setLoadingStudents(false);
    }
  };

  // Handle Bulk Status Update
  const handleBulkUpdate = async (status: string) => {
    if (selectedStudents.length === 0) {
      alert("Please select at least one student.");
      return;
    }
    setTrackingSaving(true);
    try {
      const payload = selectedStudents.map(studentId => ({
        studentId,
        status,
        feedback: studentStatuses[studentId]?.feedback || ""
      }));
      await homeworkApi.bulkUpdateStatus(trackHw.id, payload);
      
      // Update local state
      setStudentStatuses(prev => {
        const next = { ...prev };
        selectedStudents.forEach(id => {
          next[id] = { ...next[id], status };
        });
        return next;
      });
      setSelectedStudents([]);
      alert("Homework status updated successfully!");
      fetchHomeworks();
    } catch (e: any) {
      alert(e.message || "Failed to update statuses");
    } finally {
      setTrackingSaving(false);
    }
  };

  const handleSingleUpdate = async (studentId: number, status: string, feedback: string) => {
    setTrackingSaving(true);
    try {
      await homeworkApi.bulkUpdateStatus(trackHw.id, [{ studentId, status, feedback }]);
      setStudentStatuses(prev => ({
        ...prev,
        [studentId]: { status, feedback }
      }));
      fetchHomeworks();
    } catch (e: any) {
      alert(e.message || "Failed to update status");
    } finally {
      setTrackingSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this homework?")) return;
    try {
      await homeworkApi.remove(id);
      fetchHomeworks();
    } catch (e: any) {
      alert(e.message || "Failed to delete homework");
    }
  };

  return (
    <DashboardShell title="Homework Assignments">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Assign & Track Homework</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Manage assignments, due dates, and notebook grading.</p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="bg-primary hover:bg-primary/95 text-white">
            <Plus className="h-4 w-4 mr-2" /> Assign Homework
          </Button>
        </div>

        {/* Homework list table */}
        <Card className="shadow-sm border-border/60">
          <CardHeader className="pb-3"><CardTitle className="text-base font-semibold">Active Assignments</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : homeworks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">No homework assigned yet. Click "Assign Homework" to begin.</div>
            ) : (
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Subject</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-center">Completion Stats</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {homeworks.map((hw) => (
                      <TableRow key={hw.id} className="hover:bg-muted/30">
                        <TableCell className="font-semibold">{hw.subject}</TableCell>
                        <TableCell className="font-medium text-slate-700">{hw.title}</TableCell>
                        <TableCell><Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100">{hw.batch}</Badge></TableCell>
                        <TableCell className="text-muted-foreground text-sm">{new Date(hw.due_date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="text-xs font-semibold text-slate-800">
                              {hw.completed_count}/{hw.total_students} Checked
                            </span>
                            <span className="text-[10px] text-muted-foreground mt-0.5">
                              ({hw.total_students > 0 ? Math.round((hw.completed_count / hw.total_students) * 100) : 0}% Done)
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <Button size="sm" variant="outline" className="text-blue-600 hover:text-blue-700 border-blue-100 hover:bg-blue-50"
                              title="Track Student Statuses" onClick={() => openTrackModal(hw)}>
                              <Users className="h-4 w-4 mr-1.5" /> Grade
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0"
                              onClick={() => { setEditHw(hw); setEditOpen(true); }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="destructive" className="h-8 w-8 p-0"
                              onClick={() => handleDelete(hw.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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

      {/* CREATE DIALOG */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New Homework Assignment</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="branch">Branch <span className="text-destructive">*</span></Label>
                <select id="branch" value={newHw.branch} onChange={e => setNewHw({...newHw, branch: e.target.value})} 
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="">Select Branch</option>
                  {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="board">Board <span className="text-destructive">*</span></Label>
                <select id="board" value={newHw.board} onChange={e => setNewHw({...newHw, board: e.target.value})} 
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="">Select Board</option>
                  {BOARDS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="standard">Std (Standard) <span className="text-destructive">*</span></Label>
                <select id="standard" value={newHw.standard} onChange={e => setNewHw({...newHw, standard: e.target.value})} 
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="">Select Standard</option>
                  {STANDARDS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="subject">Subject <span className="text-destructive">*</span></Label>
                <select id="subject" value={newHw.subject} onChange={e => setNewHw({...newHw, subject: e.target.value})} 
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="">Select Subject</option>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="chapter">Chapter Name <span className="text-destructive">*</span></Label>
                <Input id="chapter" value={newHw.chapter} onChange={e => setNewHw({...newHw, chapter: e.target.value})} placeholder="e.g. Chapter 4 Integration" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="topic">Topic Name <span className="text-destructive">*</span></Label>
                <Input id="topic" value={newHw.topic} onChange={e => setNewHw({...newHw, topic: e.target.value})} placeholder="e.g. Integration by parts" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dueDate">Due Date <span className="text-destructive">*</span></Label>
              <Input id="dueDate" type="date" value={newHw.dueDate} onChange={e => setNewHw({...newHw, dueDate: e.target.value})} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="desc">Instructions / Description</Label>
              <Textarea id="desc" value={newHw.description} onChange={e => setNewHw({...newHw, description: e.target.value})} placeholder="Write details here (Markdown supported)..." />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="attachment">Attachment File (Optional)</Label>
              <div className="flex items-center gap-2">
                <Input 
                  id="attachment" 
                  type="file" 
                  accept="image/*,application/pdf"
                  onChange={(e) => handleFileUpload(e, false)} 
                  disabled={uploadingAttachment}
                  className="flex-1"
                />
                {uploadingAttachment && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
              </div>
              {newHw.attachmentUrl && (
                <div className="flex items-center gap-2 mt-2 text-sm text-emerald-600 font-medium">
                  <CheckCircle className="h-4 w-4" /> File uploaded successfully
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={saving} className="bg-primary hover:bg-primary/95 text-white">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT DIALOG */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Homework Details</DialogTitle></DialogHeader>
          {editHw && (
            <div className="space-y-4 py-2 text-sm">
              <div className="space-y-1.5 bg-muted/40 p-2.5 rounded-lg border">
                <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Class / Batch</Label>
                <p className="font-bold text-xs text-slate-800">{editHw.batch}</p>
                <p className="text-[10px] text-rose-500 font-medium mt-0.5">⚠️ Edits will only apply to this batch. Other batches must be edited separately.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-title">Title <span className="text-destructive">*</span></Label>
                <Input id="edit-title" value={editHw.title} onChange={e => setEditHw({...editHw, title: e.target.value})} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-dueDate">Due Date <span className="text-destructive">*</span></Label>
                <Input id="edit-dueDate" type="date" value={editHw.due_date ? editHw.due_date.split("T")[0] : ""} onChange={e => setEditHw({...editHw, due_date: e.target.value})} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-desc">Instructions</Label>
                <Textarea id="edit-desc" value={editHw.description} onChange={e => setEditHw({...editHw, description: e.target.value})} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-attachment">Attachment File</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    id="edit-attachment" 
                    type="file" 
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileUpload(e, true)} 
                    disabled={uploadingAttachment}
                    className="flex-1"
                  />
                  {uploadingAttachment && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                </div>
                {editHw.attachment_url && (
                  <div className="flex items-center gap-2 mt-2">
                    <a href={editHw.attachment_url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                      <FileText className="h-4 w-4" /> View Current Attachment
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={saving} className="bg-primary hover:bg-primary/95 text-white">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TRACK STATUS DIALOG (BULK UPDATES) */}
      <Dialog open={trackOpen} onOpenChange={setTrackOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Users className="h-5 w-5 text-primary" /> Grade Notebooks — {trackHw?.title}
            </DialogTitle>
          </DialogHeader>

          {loadingStudents ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-4 py-2 text-sm">
              {/* Bulk operations bar */}
              <div className="flex items-center justify-between p-2.5 bg-muted/40 border rounded-lg">
                <span className="text-xs font-semibold text-slate-700">{selectedStudents.length} Students Selected</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleBulkUpdate("Completed")} disabled={selectedStudents.length === 0 || trackingSaving}
                    className="text-emerald-700 hover:text-emerald-800 border-emerald-200 hover:bg-emerald-50 h-8">
                    <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Mark Completed
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleBulkUpdate("Late")} disabled={selectedStudents.length === 0 || trackingSaving}
                    className="text-amber-700 hover:text-amber-800 border-amber-200 hover:bg-amber-50 h-8">
                    <Clock className="h-3.5 w-3.5 mr-1.5" /> Mark Late
                  </Button>
                </div>
              </div>

              {/* Student table */}
              <div className="rounded-lg border overflow-x-auto max-h-[40vh] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10">
                    <TableRow className="bg-muted/45">
                      <TableHead className="w-[40px] text-center">
                        <input type="checkbox"
                          checked={selectedStudents.length === students.length && students.length > 0}
                          onChange={e => {
                            setSelectedStudents(e.target.checked ? students.map(s => s.id) : []);
                          }}
                        />
                      </TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Feedback</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">No students active in this standard.</TableCell></TableRow>
                    ) : students.map((student) => {
                      const details = studentStatuses[student.id] || { status: "Pending", feedback: "" };
                      return (
                        <TableRow key={student.id} className="hover:bg-muted/20">
                          <TableCell className="text-center">
                            <input type="checkbox"
                              checked={selectedStudents.includes(student.id)}
                              onChange={e => {
                                const checked = e.target.checked;
                                setSelectedStudents(prev => checked ? [...prev, student.id] : prev.filter(id => id !== student.id));
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-semibold text-slate-700">{student.name}</TableCell>
                          <TableCell>
                            <select value={details.status}
                              onChange={e => handleSingleUpdate(student.id, e.target.value, details.feedback)}
                              className="text-xs font-semibold rounded-md border border-input bg-background px-2.5 py-1.5 focus:ring-primary/20 cursor-pointer">
                              <option value="Pending">Pending</option>
                              <option value="Completed">Completed</option>
                              <option value="Late">Late</option>
                            </select>
                          </TableCell>
                          <TableCell>
                            <Input
                              value={details.feedback}
                              onChange={e => setStudentStatuses(prev => ({
                                ...prev,
                                [student.id]: { ...prev[student.id], feedback: e.target.value }
                              }))}
                              onBlur={e => handleSingleUpdate(student.id, details.status, e.target.value)}
                              placeholder="e.g. Excellent work!"
                              className="h-8 text-xs placeholder:text-muted-foreground/60 w-36"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <DialogFooter className="border-t pt-3">
            <Button variant="outline" onClick={() => setTrackOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
