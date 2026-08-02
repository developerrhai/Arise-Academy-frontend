"use client";

import { useEffect, useRef, useState } from "react";
import { useChatStore } from "@/lib/chatStore";
import { chatMessagesApi } from "@/lib/api";
import { ChatHeader } from "./ChatHeader";
import { ChatMessageList } from "./ChatMessageList";
import { ChatInput } from "./ChatInput";
import { MessageSquare } from "lucide-react";

export function ChatRoom() {
  const { activeGroupId, messages, setMessages } = useChatStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeGroupId) return;

    const loadMessages = async () => {
      setLoading(true);
      try {
        const res = await chatMessagesApi.getMessages(activeGroupId);
        if (res.success) {
          // API returns newest first due to DESC, reverse it for chronological display
          const messagesData = Array.isArray(res.data) ? res.data : [];
          setMessages(activeGroupId, messagesData.reverse());
        }
      } catch (err) {
        console.error("Failed to load messages", err);
      } finally {
        setLoading(false);
      }
    };

    // Only load if we don't have them in state (or could always reload to ensure fresh)
    const currentMessages = messages[activeGroupId];
    if (!currentMessages || currentMessages.length === 0) {
      loadMessages();
    }
  }, [activeGroupId]);

  if (!activeGroupId) {
    return (
      <div className="hidden md:flex flex-1 flex-col items-center justify-center text-muted-foreground bg-accent/10">
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
