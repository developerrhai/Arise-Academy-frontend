import { DashboardShell } from "@/components/teacher/DashboardShell";
import { NotesDropdownView } from "@/components/teacher/NotesDropdownView";
import { Toaster } from "@/components/ui/sonner";

export default function NotesDropdownPage() {
  return (
    <DashboardShell title="Notes (All-in-One)">
      <NotesDropdownView />
      <Toaster richColors position="top-center" />
    </DashboardShell>
  );
}
