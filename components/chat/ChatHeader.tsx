"use client";

import React, { useState, useEffect } from "react";

import { useChatStore } from "@/lib/chatStore";
import { chatGroupsApi } from "@/lib/api";
import { Users, Trash } from "lucide-react";
import { ManageGroupMembers } from "./ManageGroupMembers";
import { toast } from "sonner";

export function ChatHeader() {
  const { activeGroupId, groups, setGroups, setActiveGroup } = useChatStore();
  const group = groups.find((g) => g.id === activeGroupId);

  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    try {
      const info = localStorage.getItem("userInfo");
      if (info) {
        const userRole = JSON.parse(info).role;
        setIsAdmin(userRole === "admin" || userRole === "ADMIN");
      }
    } catch (e) {}
  }, []);

  const refreshGroups = async () => {
    try {
      const res = isAdmin
        ? await chatGroupsApi.getAll()
        : await chatGroupsApi.getMyGroups();
      if (res.success) setGroups(res.data);
    } catch (err) {
      console.error("Failed to refresh groups", err);
    }
  };

  const handleDeleteGroup = async () => {
    if (!activeGroupId) return;
    if (!confirm("Are you sure you want to delete this group?")) return;
    try {
      const res = await chatGroupsApi.delete(activeGroupId);
      if (res.success) {
        toast.success("Group deleted");
        setActiveGroup(null);
        refreshGroups();
      } else {
        toast.error(res.message || "Failed to delete group");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error deleting group");
    }
  };

  if (!group) return null;

  return (
    <div className="h-16 px-6 border-b border-border/70 flex items-center justify-between bg-background/50 backdrop-blur-sm z-10 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center shrink-0">
          <Users className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground tracking-tight leading-none">
            {group.name}
          </h3>
          <span className="text-xs text-muted-foreground mt-1">
            {group.description || "Group Chat"}
            {(group as any).member_count != null && (
              <span className="ml-2">• {(group as any).member_count} members</span>
            )}
          </span>
        </div>
      </div>
      
      {isAdmin && (
         <div className="flex items-center gap-2">
            <ManageGroupMembers groupId={group.id} onMembersChanged={refreshGroups} />
            <button
              onClick={handleDeleteGroup}
              className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Delete Group"
            >
              <Trash className="h-4 w-4" />
            </button>
         </div>
      )}
    </div>
  );
}
