"use client";

import { ChatLayout } from "@/components/chat/ChatLayout";
import { DashboardShell } from "@/components/teacher/DashboardShell";

export default function TeacherChatPage() {
  return (
    <DashboardShell title="Group Chat">
      <div className="space-y-6">
        <div>
          <p className="text-muted-foreground mt-2">
            Communicate with your classes and administration.
          </p>
        </div>
        
        <ChatLayout />
      </div>
    </DashboardShell>
  );
}
