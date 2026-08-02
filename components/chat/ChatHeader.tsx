"use client";

import { useChatStore } from "@/lib/chatStore";
import { Users, ChevronLeft } from "lucide-react";
import { ManageGroupMembers } from "./ManageGroupMembers";

export function ChatHeader() {
  const { activeGroupId, groups, setActiveGroup } = useChatStore();
  const group = groups.find((g) => g.id === activeGroupId);

  let isAdmin = false;
  try {
     const info = localStorage.getItem("userInfo");
     if (info) {
       const userRole = JSON.parse(info).role;
       isAdmin = userRole === "admin";
     }
  } catch (e) {}

  if (!group) return null;

  return (
    <div className="h-16 px-6 border-b border-border/70 flex items-center justify-between bg-background/50 backdrop-blur-sm z-10 shadow-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setActiveGroup(null)}
          className="md:hidden h-9 w-9 flex items-center justify-center rounded-full hover:bg-accent shrink-0 text-muted-foreground"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center shrink-0">
          <Users className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground tracking-tight leading-none">
            {group.name}
          </h3>
          <span className="text-xs text-muted-foreground mt-1">
            {group.description || "Group Chat"}
          </span>
        </div>
      </div>
      
      {isAdmin && (
         <div className="flex items-center gap-2">
            <ManageGroupMembers groupId={group.id} />
         </div>
      )}
    </div>
  );
}
