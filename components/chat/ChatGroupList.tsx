"use client";

import { useChatStore } from "@/lib/chatStore";
import { cn } from "@/lib/utils";
import { MessageSquare, Users } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getSocket } from "@/lib/socket";

export function ChatGroupList() {
  const { groups, activeGroupId, setActiveGroup } = useChatStore();

  const handleGroupSelect = (id: number) => {
    setActiveGroup(id);
    const socket = getSocket();
    socket.emit("join_group", { groupId: id });
  };

  return (
    <div className={cn(
      "border-r border-border/70 flex-col bg-background/50",
      activeGroupId ? "hidden md:flex md:w-72 shrink-0" : "flex w-full md:w-72 shrink-0"
    )}>
      <div className="p-4 border-b border-border/70">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Chat Groups
        </h2>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {groups.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No groups found.
            </div>
          ) : (
            groups.map((group) => (
              <button
                key={group.id}
                onClick={() => handleGroupSelect(group.id)}
                className={cn(
                  "w-full flex flex-col items-start gap-1 p-3 rounded-lg text-left transition-colors",
                  activeGroupId === group.id
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "hover:bg-accent/50 text-foreground"
                )}
              >
                <div className="font-medium flex items-center justify-between w-full">
                  <span className="truncate">{group.name}</span>
                  <Users className="h-3.5 w-3.5 opacity-70 shrink-0" />
                </div>
                <div className={cn(
                  "text-xs truncate w-full",
                  activeGroupId === group.id ? "text-sidebar-primary-foreground/70" : "text-muted-foreground"
                )}>
                  {group.description || "No description"}
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
