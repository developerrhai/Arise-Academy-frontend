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
import { UserPlus } from "lucide-react";
import { studentsApi, teachersApi, chatGroupsApi } from "@/lib/api";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function ManageGroupMembers({ groupId }: { groupId: number }) {
  const [open, setOpen] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<{id: number, role: string}[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const [stdRes, tchRes] = await Promise.all([
        studentsApi.getAll(), // You can add params if needed
        teachersApi.getAll()
      ]);
      if (stdRes.success) setStudents(stdRes.data);
      if (tchRes.success) setTeachers(tchRes.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const toggleMember = (id: number, role: string) => {
    setSelectedMembers(prev => {
      const exists = prev.find(m => m.id === id && m.role === role);
      if (exists) {
        return prev.filter(m => !(m.id === id && m.role === role));
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
        toast.success("Members added successfully!");
        setOpen(false);
        setSelectedMembers([]);
      } else {
        toast.error(res.message || "Failed to add members");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-8">
          <UserPlus className="h-4 w-4" />
          Add Members
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Members to Group</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-10 flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="space-y-4 pt-4">
            <ScrollArea className="h-72 border border-border/70 rounded-md p-2">
              <div className="space-y-4">
                {/* Teachers Section */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Teachers</h4>
                  <div className="space-y-1">
                    {teachers.map(t => {
                      const isSelected = selectedMembers.some(m => m.id === t.id && m.role === 'TEACHER');
                      return (
                        <div 
                          key={`tch-${t.id}`}
                          onClick={() => toggleMember(t.id, 'TEACHER')}
                          className={cn(
                            "flex items-center justify-between p-2 rounded cursor-pointer transition-colors text-sm",
                            isSelected ? "bg-primary/20" : "hover:bg-accent"
                          )}
                        >
                          <span>{t.name}</span>
                          <span className="text-xs text-muted-foreground">Teacher</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Students Section */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-muted-foreground mt-4">Students</h4>
                  <div className="space-y-1">
                    {students.map(s => {
                      const isSelected = selectedMembers.some(m => m.id === s.id && m.role === 'STUDENT');
                      return (
                        <div 
                          key={`std-${s.id}`}
                          onClick={() => toggleMember(s.id, 'STUDENT')}
                          className={cn(
                            "flex items-center justify-between p-2 rounded cursor-pointer transition-colors text-sm",
                            isSelected ? "bg-primary/20" : "hover:bg-accent"
                          )}
                        >
                          <span>{s.name}</span>
                          <span className="text-xs text-muted-foreground">Student</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </ScrollArea>

            <Button 
              className="w-full" 
              onClick={handleAddMembers} 
              disabled={isSubmitting || selectedMembers.length === 0}
            >
              {isSubmitting ? "Adding..." : `Add ${selectedMembers.length} Members`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
