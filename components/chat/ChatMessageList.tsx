"use client";

import { useChatStore, ChatMessage as ChatMessageType } from "@/lib/chatStore";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

export function ChatMessageList({ groupId }: { groupId: number }) {
  const messagesFromStore = useChatStore((state) => state.messages[groupId]);
  const messages = messagesFromStore || [];
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Get current user id from localStorage token/info for self-styling
  let currentUserId = -1;
  let currentUserRole = "";
  try {
     const info = localStorage.getItem("userInfo");
     if (info) {
       const parsed = JSON.parse(info);
       currentUserId = parsed.id;
       currentUserRole = parsed.role;
     }
  } catch (e) {}

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <ScrollArea className="h-full px-4 py-6">
      <div className="flex flex-col gap-4 max-w-3xl mx-auto w-full">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-10">
            No messages yet. Say hello!
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.sender_id === currentUserId && 
                         msg.sender_role?.toLowerCase() === currentUserRole?.toLowerCase();
            
            return (
              <div
                key={msg.id || index}
                className={cn(
                  "flex flex-col max-w-[75%]",
                  isMe ? "self-end items-end" : "self-start items-start"
                )}
              >
                {!isMe && (
                  <span className="text-xs text-muted-foreground mb-1 ml-1 font-medium">
                    {msg.sender_name} <span className="opacity-70 font-normal">({msg.sender_role})</span>
                  </span>
                )}
                <div
                  className={cn(
                    "px-4 py-2 text-sm shadow-sm",
                    isMe 
                      ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm" 
                      : "bg-muted text-foreground rounded-2xl rounded-tl-sm"
                  )}
                  style={isMe ? { background: "var(--gradient-primary)" } : {}}
                >
                  {msg.message_text}
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 mx-1 opacity-70">
                  {msg.created_at ? (() => { try { return format(new Date(msg.created_at), "h:mm a") } catch(e) { return "" } })() : ""}
                </span>
              </div>
            );
          })
        )}
        <div ref={scrollRef} />
      </div>
    </ScrollArea>
  );
}
