"use client";

import { useEffect } from "react";
import { getSocket, disconnectSocket } from "@/lib/socket";
import { useChatStore, ChatGroup } from "@/lib/chatStore";
import { chatGroupsApi } from "@/lib/api";
import { ChatGroupList } from "./ChatGroupList";
import { ChatRoom } from "./ChatRoom";
import { toast } from "sonner";

export function ChatLayout() {
  const { setGroups, setActiveGroup, addMessage, activeGroupId } = useChatStore();

  useEffect(() => {
    // 1. Fetch groups from API
    const loadGroups = async () => {
      try {
        let isAdmin = false;
        try {
          const info = localStorage.getItem("userInfo");
          if (info) {
            isAdmin = JSON.parse(info).role === "admin";
          }
        } catch (e) {}

        const res = isAdmin ? await chatGroupsApi.getAll() : await chatGroupsApi.getMyGroups();
        if (res.success) {
          setGroups(res.data);
          if (res.data.length > 0 && !activeGroupId) {
             setActiveGroup(res.data[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load chat groups", err);
      }
    };
    loadGroups();

    // 2. Initialize Socket connection
    const socket = getSocket();

    socket.on("receive_message", (message) => {
      addMessage(message.group_id, message);
    });

    socket.on("member_removed", (data) => {
      toast.error("You were removed from a group.");
      loadGroups(); // Refresh groups
      if (activeGroupId === data.groupId) {
         setActiveGroup(null);
      }
    });

    return () => {
      disconnectSocket();
    };
  }, []);

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-card border border-border/70 rounded-xl shadow-[var(--shadow-soft)] overflow-hidden">
      <ChatGroupList />
      <ChatRoom />
    </div>
  );
}
