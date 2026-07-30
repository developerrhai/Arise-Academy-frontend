"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useAuthStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentShell } from "@/components/student/StudentShell";
import { teacherStudentAssessmentsApi } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Calendar,
  Award,
  BookOpen,
  Search,
  TrendingUp,
  Percent,
  CheckCircle,
} from "lucide-react";

interface Assessment {
  id: number;
  subject: string;
  marks: number;
  total_marks?: number;
  examination: string;
  exam_date: string;
}

const fmtDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

function getGrade(marks: number, total?: number): { label: string; color: string } {
  const pct = total && total > 0 ? (marks / total) * 100 : marks;
  if (pct >= 90) return { label: "A+", color: "bg-emerald-100 text-emerald-700 border-emerald-200" };
  if (pct >= 80) return { label: "A", color: "bg-green-100 text-green-700 border-green-200" };
  if (pct >= 70) return { label: "B+", color: "bg-blue-100 text-blue-700 border-blue-200" };
  if (pct >= 60) return { label: "B", color: "bg-sky-100 text-sky-700 border-sky-200" };
  if (pct >= 50) return { label: "C", color: "bg-amber-100 text-amber-700 border-amber-200" };
  if (pct >= 35) return { label: "D", color: "bg-orange-100 text-orange-700 border-orange-200" };
  return { label: "F", color: "bg-red-100 text-red-700 border-red-200" };
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
      <div className="h-16 w-16 rounded-3xl bg-muted/60 grid place-items-center">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <p className="text-lg text-muted-foreground font-medium">{message}</p>
    </div>
  );
}

export default function StudentMarksPage() {
  const token = useAuthStore((state) => state.token);
  const userRole = useAuthStore((state) => state.user?.role);
  const _hasHydrated = useAuthStore((state) => state._hasHydrated);

  const router = useRouter();

  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  // Filtering & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterExam, setFilterExam] = useState("all");

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchMarks = useCallback(async () => {
    setLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://institute-api.rhaitech.online/api";
      const res = await fetch(`${apiBase}/dashboard/student`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        router.replace("/student-login");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch profile");

      const json = await res.json();
      const profile = json?.profile;

      if (profile?.id) {
        const marksRes: any = await teacherStudentAssessmentsApi.getByStudent(profile.id);
        setAssessments(marksRes.data || []);
      }
    } catch (err) {
      console.error("Marks fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }, [token, router]);

  useEffect(() => {
    if (!mounted || !_hasHydrated) return;
    const role = (userRole ?? "").toUpperCase();
    if (!token || role !== "STUDENT") {
      router.push("/student-login");
      return;
    }
    fetchMarks();
  }, [mounted, _hasHydrated, token, userRole, router, fetchMarks]);

  // Derived filter options
  const subjects = useMemo(() => Array.from(new Set(assessments.map((a) => a.subject))).filter(Boolean), [assessments]);
  const exams = useMemo(() => Array.from(new Set(assessments.map((a) => a.examination))).filter(Boolean), [assessments]);

  // Filtered List
  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return assessments.filter((a) => {
      const matchesSearch = q.length === 0 ||
        a.subject.toLowerCase().includes(q) ||
        a.examination.toLowerCase().includes(q);
      const matchesSub = filterSubject === "all" || a.subject === filterSubject;
      const matchesExam = filterExam === "all" || a.examination === filterExam;
      return matchesSearch && matchesSub && matchesExam;
    });
  }, [assessments, searchTerm, filterSubject, filterExam]);

  // Stats calculation
  const stats = useMemo(() => {
    if (assessments.length === 0) {
      return { totalTests: 0, avgPct: 0, bestScore: 0, bestSubject: "—" };
    }
    const totalTests = assessments.length;
    let totalPct = 0;
    let bestPct = 0;
    let bestSubject = "—";

    assessments.forEach((a) => {
      const pct = a.total_marks && a.total_marks > 0 ? (a.marks / a.total_marks) * 100 : a.marks;
      totalPct += pct;
      if (pct > bestPct) {
        bestPct = pct;
        bestSubject = `${a.subject} (${a.marks}${a.total_marks ? `/${a.total_marks}` : ""})`;
      }
    });

    return {
      totalTests,
      avgPct: Math.round(totalPct / totalTests),
      bestScore: Math.round(bestPct),
      bestSubject,
    };
  }, [assessments]);

  if (!mounted || !_hasHydrated || loading) {
    return (
      <StudentShell title="My Marks">
        <div className="rounded-2xl bg-card border border-border/70 p-6 animate-pulse space-y-3">
          <div className="h-4 w-1/3 bg-muted rounded-full" />
          <div className="h-4 w-full bg-muted rounded-full" />
          <div className="h-4 w-2/3 bg-muted rounded-full" />
        </div>
      </StudentShell>
    );
  }

  return (
    <StudentShell title="My Marks">
      <div className="space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-violet-500 to-purple-600">
            <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-bl-[30px]" />
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-violet-100 text-xs font-medium uppercase tracking-wider">Total Tests</p>
                <p className="text-3xl font-bold text-white mt-1">{stats.totalTests}</p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-500 to-cyan-600">
            <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-bl-[30px]" />
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs font-medium uppercase tracking-wider">Average Score</p>
                <p className="text-3xl font-bold text-white mt-1">{stats.avgPct}%</p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                <Percent className="h-5 w-5 text-white" />
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-teal-600">
            <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-bl-[30px]" />
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-xs font-medium uppercase tracking-wider">Best Performance</p>
                <p className="text-lg font-bold text-white mt-1.5 truncate max-w-[170px]">{stats.bestSubject}</p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                <Award className="h-5 w-5 text-white" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Marks Card */}
        <Card className="rounded-2xl shadow-[var(--shadow-soft)] border border-border/70 min-h-[50vh]">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Award className="h-6 w-6 text-primary" /> Test Results & Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filter Toolbar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search subject or test..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 rounded-xl"
                />
              </div>

              <Select value={filterSubject} onValueChange={setFilterSubject}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="All Subjects" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjects.map((sub) => <SelectItem key={sub} value={sub}>{sub}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={filterExam} onValueChange={setFilterExam}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="All Examinations" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Examinations</SelectItem>
                  {exams.map((exam) => <SelectItem key={exam} value={exam}>{exam}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Marks Table */}
            {filtered.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-border/50">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">
                    <tr>
                      <th className="py-4 px-4 font-semibold">Date</th>
                      <th className="py-4 px-4 font-semibold">Subject</th>
                      <th className="py-4 px-4 font-semibold">Examination</th>
                      <th className="py-4 px-4 font-semibold text-center">Marks Obtained</th>
                      <th className="py-4 px-4 font-semibold text-center">Total Marks</th>
                      <th className="py-4 px-4 font-semibold text-center">Percentage</th>
                      <th className="py-4 px-4 font-semibold text-center">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((a) => {
                      const grade = getGrade(a.marks, a.total_marks);
                      const pct = a.total_marks && a.total_marks > 0
                        ? Math.round((a.marks / a.total_marks) * 100)
                        : null;
                      return (
                        <tr key={a.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="py-4 px-4 text-muted-foreground whitespace-nowrap">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {fmtDate(a.exam_date)}
                            </span>
                          </td>
                          <td className="py-4 px-4 font-medium text-foreground">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold">
                              <BookOpen className="h-3 w-3" />
                              {a.subject}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-foreground">{a.examination}</td>
                          <td className="py-4 px-4 text-center font-bold text-base text-foreground">{a.marks}</td>
                          <td className="py-4 px-4 text-center text-muted-foreground">
                            {a.total_marks !== undefined ? a.total_marks : "—"}
                          </td>
                          <td className="py-4 px-4 text-center">
                            {pct !== null ? (
                              <span className={`font-semibold ${pct >= 75 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-red-500"}`}>
                                {pct}%
                              </span>
                            ) : "—"}
                          </td>
                          <td className="py-4 px-4 text-center">
                            <Badge className={`${grade.color} border text-xs font-bold px-2.5 py-0.5`}>
                              {grade.label}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState icon={Award} message="No test results found." />
            )}
          </CardContent>
        </Card>
      </div>
    </StudentShell>
  );
}
