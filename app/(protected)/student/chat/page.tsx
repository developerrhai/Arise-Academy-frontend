"use client";

import { ChatLayout } from "@/components/chat/ChatLayout";
import { StudentShell } from "@/components/student/StudentShell";

export default function StudentChatPage() {
  return (
    <StudentShell title="Group Chat">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Group Chat</h1>
          <p className="text-muted-foreground">
            Discuss homework and ask doubts in your class groups.
          </p>
        </div>
        
        <ChatLayout />
      </div>
    </StudentShell>
  );
}
