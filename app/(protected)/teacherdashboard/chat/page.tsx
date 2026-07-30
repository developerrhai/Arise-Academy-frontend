"use client";

import { ChatLayout } from "@/components/chat/ChatLayout";

export default function TeacherChatPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Group Chat</h1>
        <p className="text-muted-foreground">
          Communicate with your classes and administration.
        </p>
      </div>
      
      <ChatLayout />
    </div>
  );
}
