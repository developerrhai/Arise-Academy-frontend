"use client";

import { ChatLayout } from "@/components/chat/ChatLayout";

export default function StudentChatPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Group Chat</h1>
        <p className="text-muted-foreground">
          Discuss homework and ask doubts in your class groups.
        </p>
      </div>
      
      <ChatLayout />
    </div>
  );
}
