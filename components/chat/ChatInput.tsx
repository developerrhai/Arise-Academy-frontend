"use client";

import { useState } from "react";
import { getSocket } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { SendHorizontal } from "lucide-react";
import { toast } from "sonner";

export function ChatInput({ groupId }: { groupId: number }) {
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setIsSending(true);
    const socket = getSocket();
    
    socket.emit("send_message", { groupId, messageText: text }, (response: any) => {
      setIsSending(false);
      if (response && response.success) {
        setText("");
      } else {
        toast.error(response?.message || "Failed to send message");
      }
    });
  };

  return (
    <div className="p-4 bg-background border-t border-border/70">
      <form onSubmit={handleSend} className="flex gap-2 max-w-3xl mx-auto w-full">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-accent/50 border border-border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
          disabled={isSending}
        />
        <Button 
          type="submit" 
          disabled={!text.trim() || isSending}
          size="icon"
          className="rounded-full shrink-0 shadow-[var(--shadow-soft)]"
          style={{ background: "var(--gradient-primary)" }}
        >
          <SendHorizontal className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
