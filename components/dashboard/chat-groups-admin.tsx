"use client";

import { useState } from "react";
import { ChatLayout } from "@/components/chat/ChatLayout";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { chatGroupsApi } from "@/lib/api";
import { toast } from "sonner";
import { useChatStore } from "@/lib/chatStore";

export function ChatGroupsAdmin() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { setGroups } = useChatStore();

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await chatGroupsApi.create({ name, description: desc });
      if (res.success) {
        toast.success("Group created successfully!");
        setOpen(false);
        setName("");
        setDesc("");
        
        // Refresh groups
        const groupsRes = await chatGroupsApi.getAll();
        if (groupsRes.success) setGroups(groupsRes.data);
      } else {
        toast.error(res.message || "Failed to create group");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4 relative">
      <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-border/70 shadow-[var(--shadow-soft)]">
        <div>
          <h2 className="text-xl font-bold">Group Chat Management</h2>
          <p className="text-sm text-muted-foreground">
            Chat with teachers and students in real-time.
          </p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-slate-900 text-white hover:bg-slate-800">
              <PlusCircle className="h-4 w-4" />
              New Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Chat Group</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateGroup} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Group Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-accent/50 border border-border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="e.g. 10th Standard Science"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description (Optional)</label>
                <input
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full bg-accent/50 border border-border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="e.g. Announcements and doubt solving"
                />
              </div>
              <Button type="submit" disabled={isSubmitting || !name.trim()} className="w-full">
                {isSubmitting ? "Creating..." : "Create Group"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <ChatLayout />
    </div>
  );
}
