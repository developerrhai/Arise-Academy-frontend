"use client";

import { ReactNode, useEffect, useState } from "react";
import { StudentSidebar } from "./StudentSidebar";
import { Bell, Search, Menu, X } from "lucide-react";
import { getToken } from "@/lib/api";
import { registerPushNotificationToken } from "@/lib/push-notification";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";

export function StudentShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [userInitial, setUserInitial] = useState("S");

  useEffect(() => {
    if (user?.name) {
      setUserInitial(user.name.charAt(0).toUpperCase());
    } else if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("userInfo");
        if (stored) {
          const parsed = JSON.parse(stored);
          const name = parsed?.name;
          if (name) {
            setUserInitial(name.charAt(0).toUpperCase());
          }
        }
      } catch {
        /* ignore */
      }
    }
  }, [user]);

  useEffect(() => {
    // Guard: redirect to login if no token present
    const hasToken = !!getToken();
    if (!hasToken) {
      router.replace("/student-login");
      return;
    }

    // Guard: redirect if not a student role
    const storedUser = localStorage.getItem("userInfo");
    let userRole: string | null = null;
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        userRole = (u?.role as string)?.toUpperCase() ?? null;
      } catch {
        userRole = null;
      }
    }

    if (userRole !== "STUDENT") {
      router.replace("/");
    }

    // Trigger Push Notification registration
    registerPushNotificationToken().catch(console.error);

    // Guard: redirect to change-password if is_first_login is true
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        if (u.is_first_login) {
          // If we are not already on the change-password page, redirect there
          if (window.location.pathname !== "/student/change-password") {
            router.replace("/student/change-password");
          }
        }
      } catch {
        // ignore parse error
      }
    }
  }, [router]);

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      <StudentSidebar />

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div className="absolute inset-y-0 left-0 w-64" onClick={(e) => e.stopPropagation()}>
            <StudentSidebar className="flex md:hidden" />
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky top header */}
        <header className="h-16 border-b border-border/70 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70 flex items-center px-4 md:px-8 gap-4 sticky top-0 z-20">
          {/* Mobile menu toggle */}
          <button
            className="md:hidden h-9 w-9 grid place-items-center rounded-full border border-border/70 bg-card hover:bg-accent transition-colors"
            onClick={() => setMobileMenuOpen((o) => !o)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>

          <h1 className="text-lg md:text-xl font-semibold tracking-tight truncate">{title}</h1>

          <div className="ml-auto flex items-center gap-3">
            {/* Search bar — hidden on small screens */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/70 bg-card text-muted-foreground text-sm w-64 shadow-[var(--shadow-soft)]">
              <Search className="h-4 w-4 shrink-0" />
              <input
                placeholder="Search..."
                className="bg-transparent outline-none w-full text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {/* Notification bell */}
            <button
              className="h-9 w-9 grid place-items-center rounded-full border border-border/70 bg-card hover:bg-accent transition-colors shadow-[var(--shadow-soft)]"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
            </button>

            {/* User avatar with actual initial */}
            <div
              className="h-9 w-9 rounded-full grid place-items-center text-sm font-semibold text-primary-foreground ring-2 ring-primary/20 cursor-default"
              style={{ background: "var(--gradient-primary)" }}
              title={user?.name ?? "Student"}
            >
              {userInitial}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 md:px-8 py-6 md:py-10 bg-[radial-gradient(circle_at_top,oklch(0.96_0.02_250/.6),transparent_42%)]">
          {children}
        </main>
      </div>
    </div>
  );
}
