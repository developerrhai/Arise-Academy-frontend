"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  BookOpen,
  Receipt,
  BookMarked,
  LogOut,
  Sparkles,
  GraduationCap,
  Shield,
  Calendar,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { clearToken } from "@/lib/api";
import { useAuthStore } from "@/lib/store";

const navItems = [
  { title: "Dashboard", url: "/student/dashboard", icon: Home },
  { title: "My Homework", url: "/student/homework", icon: BookOpen },
  { title: "My Marks", url: "/student/marks", icon: GraduationCap },
  { title: "My Attendance", url: "/student/attendance", icon: Calendar },
  { title: "Fee Status", url: "/student/fees", icon: Receipt },
  { title: "Class Logs", url: "/student/class-logs", icon: BookMarked },
  { title: "Timetable", url: "/student/timetable", icon: Calendar },
  { title: "Group Chat", url: "/student/chat", icon: MessageSquare },
  { title: "Security", url: "/student/change-password", icon: Shield },
];

export function StudentSidebar() {
  const pathname = usePathname();
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    clearToken();
    logout();
    localStorage.removeItem("userInfo");
    window.location.href = "/student-login";
  };

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      {/* Brand logo */}
      <div className="px-6 py-6 flex items-center gap-2">
        <div
          className="h-9 w-9 rounded-xl grid place-items-center"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Sparkles className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <div className="font-semibold tracking-tight">Arise Academy</div>
          <div className="text-xs text-sidebar-foreground/60">Student Portal</div>
        </div>
      </div>

      {/* Navigation links */}
      <nav className="px-3 py-2 flex-1 space-y-1">
        {navItems.map((item) => {
          // Support both exact match and prefix match for sub-pages
          const active = pathname === item.url || pathname.startsWith(item.url + "/");
          return (
            <Link
              key={item.url}
              href={item.url}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-[var(--shadow-elegant)]"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </Link>
          );
        })}
      </nav>

      {/* Tip card â€” matches teacher portal pattern */}
      <div className="m-3 rounded-2xl p-4 bg-sidebar-accent/60 border border-sidebar-border">
        <div className="flex items-center gap-2 text-xs text-sidebar-foreground/70">
          <GraduationCap className="h-3.5 w-3.5" />
          Student tip
        </div>
        <div className="mt-1 text-sm font-medium leading-snug">
          Check homework daily to stay ahead of your class.
        </div>
      </div>

      {/* Logout button */}
      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium border border-red-300 bg-red-500 text-white hover:bg-red-600 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
