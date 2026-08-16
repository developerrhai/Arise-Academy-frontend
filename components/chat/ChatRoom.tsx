"use client";

import { useEffect, useState } from "react";
import { useChatStore } from "@/lib/chatStore";
import { chatMessagesApi } from "@/lib/api";
import { ChatHeader } from "./ChatHeader";
import { ChatMessageList } from "./ChatMessageList";
import { ChatInput } from "./ChatInput";
import { MessageSquare } from "lucide-react";
import { getSocket } from "@/lib/socket";

export function ChatRoom() {
  const { activeGroupId, messages, setMessages } = useChatStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeGroupId) return;

    // Join the socket room for this group
    const socket = getSocket();
    socket.emit("join_group", { groupId: activeGroupId });

    const loadMessages = async () => {
      setLoading(true);
      try {
        const res = await chatMessagesApi.getMessages(activeGroupId);
        if (res.success) {
          // API returns newest first due to DESC, reverse it for chronological display
          setMessages(activeGroupId, res.data.reverse());
        }
      } catch (err) {
        console.error("Failed to load messages", err);
      } finally {
        setLoading(false);
      }
    };

    // Always reload messages when switching groups to ensure freshness
    loadMessages();
  }, [activeGroupId]);

  if (!activeGroupId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-accent/10">
        <MessageSquare className="h-12 w-12 opacity-20 mb-4" />
        <p>Select a group to start chatting</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background/50">
      <ChatHeader />
      <div className="flex-1 overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}
        <ChatMessageList groupId={activeGroupId} />
      </div>
      <ChatInput groupId={activeGroupId} />
    </div>
  );
}
