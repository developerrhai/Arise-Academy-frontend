"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserPlus, X, Search } from "lucide-react";
import { studentsApi, teachersApi, chatGroupsApi } from "@/lib/api";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type MemberEntry = { id: number; role: string; name?: string };

export function ManageGroupMembers({ groupId, onMembersChanged }: { groupId: number; onMembersChanged?: () => void }) {
  const [open, setOpen] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [existingMembers, setExistingMembers] = useState<MemberEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<MemberEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"teachers" | "students">("teachers");

  useEffect(() => {
    if (open) {
      fetchData();
    } else {
      // Reset state when closed
      setSelectedMembers([]);
      setSearch("");
    }
  }, [open]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [stdRes, tchRes, groupRes] = await Promise.all([
        studentsApi.getAll(),
        teachersApi.getAll(),
        chatGroupsApi.getOne(groupId),
      ]);
      if (stdRes.success) setStudents(stdRes.data);
      if (tchRes.success) setTeachers(tchRes.data);
      if (groupRes.success && groupRes.data?.members) {
        setExistingMembers(
          groupRes.data.members.map((m: any) => ({
            id: m.user_id,
            role: m.user_role,
            name: m.name,
          }))
        );
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const isExistingMember = (id: number, role: string) =>
    existingMembers.some((m) => m.id === id && m.role === role);

  const isSelected = (id: number, role: string) =>
    selectedMembers.some((m) => m.id === id && m.role === role);

  const toggleMember = (id: number, role: string) => {
    if (isExistingMember(id, role)) return; // Can't toggle existing members
    setSelectedMembers((prev) => {
      const exists = prev.find((m) => m.id === id && m.role === role);
      if (exists) {
        return prev.filter((m) => !(m.id === id && m.role === role));
      } else {
        return [...prev, { id, role }];
      }
    });
  };

  const handleAddMembers = async () => {
    if (selectedMembers.length === 0) return;
    setIsSubmitting(true);
    try {
      const res = await chatGroupsApi.addMembers(groupId, selectedMembers);
      if (res.success) {
        toast.success(`${selectedMembers.length} member(s) added successfully!`);
        setOpen(false);
        setSelectedMembers([]);
        if (onMembersChanged) onMembersChanged();
      } else {
        toast.error(res.message || "Failed to add members");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while adding members");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (userId: number) => {
    try {
      const res = await chatGroupsApi.removeMember(groupId, userId);
      if (res.success) {
        toast.success("Member removed");
        setExistingMembers((prev) => prev.filter((m) => m.id !== userId));
        if (onMembersChanged) onMembersChanged();
      } else {
        toast.error(res.message || "Failed to remove member");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove member");
    }
  };

  const filteredTeachers = teachers.filter((t) =>
    t.name?.toLowerCase().includes(search.toLowerCase())
  );
  const filteredStudents = students.filter((s) =>
    s.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-8">
          <UserPlus className="h-4 w-4" />
          Members
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Group Members</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-10 flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {/* Existing Members */}
            {existingMembers.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Current Members ({existingMembers.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {existingMembers.map((m) => (
                    <div
                      key={`existing-${m.id}-${m.role}`}
                      className="flex items-center gap-1.5 bg-accent/50 border border-border/50 rounded-full px-3 py-1 text-xs"
                    >
                      <span className="font-medium">{m.name || `ID:${m.id}`}</span>
                      <span className="text-muted-foreground">({m.role})</span>
                      {m.role !== "ADMIN" && (
                        <button
                          onClick={() => handleRemoveMember(m.id)}
                          className="ml-1 hover:text-destructive transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name..."
                className="w-full bg-accent/50 border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-border/70 pb-1">
              <button
                onClick={() => setActiveTab("teachers")}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-t-md transition-colors",
                  activeTab === "teachers"
                    ? "bg-primary/10 text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Teachers ({filteredTeachers.length})
              </button>
              <button
                onClick={() => setActiveTab("students")}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-t-md transition-colors",
                  activeTab === "students"
                    ? "bg-primary/10 text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Students ({filteredStudents.length})
              </button>
            </div>

            {/* List */}
            <ScrollArea className="h-56 border border-border/70 rounded-md p-2">
              <div className="space-y-1">
                {activeTab === "teachers" &&
                  filteredTeachers.map((t) => {
                    const existing = isExistingMember(t.id, "TEACHER");
                    const selected = isSelected(t.id, "TEACHER");
                    return (
                      <div
                        key={`tch-${t.id}`}
                        onClick={() => toggleMember(t.id, "TEACHER")}
                        className={cn(
                          "flex items-center justify-between p-2 rounded cursor-pointer transition-colors text-sm",
                          existing
                            ? "bg-green-100/50 dark:bg-green-900/20 opacity-60 cursor-default"
                            : selected
                            ? "bg-primary/20 ring-1 ring-primary/30"
                            : "hover:bg-accent"
                        )}
                      >
                        <span className={existing ? "line-through" : ""}>{t.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {existing ? "✓ Already in group" : "Teacher"}
                        </span>
                      </div>
                    );
                  })}

                {activeTab === "students" &&
                  filteredStudents.map((s) => {
                    const existing = isExistingMember(s.id, "STUDENT");
                    const selected = isSelected(s.id, "STUDENT");
                    return (
                      <div
                        key={`std-${s.id}`}
                        onClick={() => toggleMember(s.id, "STUDENT")}
                        className={cn(
                          "flex items-center justify-between p-2 rounded cursor-pointer transition-colors text-sm",
                          existing
                            ? "bg-green-100/50 dark:bg-green-900/20 opacity-60 cursor-default"
                            : selected
                            ? "bg-primary/20 ring-1 ring-primary/30"
                            : "hover:bg-accent"
                        )}
                      >
                        <span className={existing ? "line-through" : ""}>{s.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {existing ? "✓ Already in group" : `Std: ${s.standard || "-"}`}
                        </span>
                      </div>
                    );
                  })}

                {activeTab === "teachers" && filteredTeachers.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-4">No teachers found</div>
                )}
                {activeTab === "students" && filteredStudents.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-4">No students found</div>
                )}
              </div>
            </ScrollArea>

            <Button
              className="w-full"
              onClick={handleAddMembers}
              disabled={isSubmitting || selectedMembers.length === 0}
            >
              {isSubmitting
                ? "Adding..."
                : selectedMembers.length > 0
                ? `Add ${selectedMembers.length} Member(s)`
                : "Select members to add"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
