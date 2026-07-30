"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  GraduationCap, Search, Pencil, Trash2, Loader2,
  BookOpen, Award, TrendingUp, Users, ChevronLeft,
  ChevronRight, ChevronsLeft, ChevronsRight, FileSpreadsheet,
  Download
} from "lucide-react"
import { studentsUniversalApi, teacherStudentAssessmentsApi } from "@/lib/api"

/* ── Types ───────────────────────────────────────────── */
interface StudentMark {
  id: number
  student_id: number
  student_name: string
  phone: string
  father_phone: string
  standard: string
  board: string
  location: string
  subject: string
  marks: number
  total_marks?: number
  examination: string
  exam_date: string
}

/* ── Grade Helper ────────────────────────────────────── */
function getGrade(marks: number, total?: number): { label: string; color: string } {
  const pct = total && total > 0 ? (marks / total) * 100 : marks
  if (pct >= 90) return { label: "A+", color: "bg-emerald-100 text-emerald-700 border-emerald-200" }
  if (pct >= 80) return { label: "A", color: "bg-green-100 text-green-700 border-green-200" }
  if (pct >= 70) return { label: "B+", color: "bg-blue-100 text-blue-700 border-blue-200" }
  if (pct >= 60) return { label: "B", color: "bg-sky-100 text-sky-700 border-sky-200" }
  if (pct >= 50) return { label: "C", color: "bg-amber-100 text-amber-700 border-amber-200" }
  if (pct >= 35) return { label: "D", color: "bg-orange-100 text-orange-700 border-orange-200" }
  return { label: "F", color: "bg-red-100 text-red-700 border-red-200" }
}

/* ── Pagination ───────────────────────────────────────── */
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

function Pagination({
  total, page, pageSize, onPageChange, onPageSizeChange,
}: {
  total: number; page: number; pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  const pageNumbers = useMemo(() => {
    const pages = new Set<number>()
    pages.add(1)
    pages.add(totalPages)
    for (let p = Math.max(1, page - 1); p <= Math.min(totalPages, page + 1); p++) pages.add(p)
    const sorted = Array.from(pages).sort((a, b) => a - b)
    const result: number[] = []
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push(-1)
      result.push(sorted[i])
    }
    return result
  }, [page, totalPages])

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-1 pt-4 pb-1">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>{total === 0 ? "No results" : `${from}–${to} of ${total}`}</span>
        <div className="flex items-center gap-1.5">
          <span className="hidden sm:inline">Rows per page</span>
          <Select value={String(pageSize)} onValueChange={(v) => { onPageSizeChange(Number(v)); onPageChange(1) }}>
            <SelectTrigger className="h-8 w-[70px] rounded-full text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((s) => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" disabled={page === 1} onClick={() => onPageChange(1)}><ChevronsLeft className="h-3.5 w-3.5" /></Button>
        <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" disabled={page === 1} onClick={() => onPageChange(page - 1)}><ChevronLeft className="h-3.5 w-3.5" /></Button>
        {pageNumbers.map((p, i) =>
          p === -1
            ? <span key={`e-${i}`} className="px-1 text-sm text-muted-foreground select-none">…</span>
            : <Button key={p} variant={p === page ? "default" : "outline"} size="icon" className="h-8 w-8 rounded-full text-xs" onClick={() => onPageChange(p)}>{p}</Button>
        )}
        <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" disabled={page === totalPages} onClick={() => onPageChange(page + 1)}><ChevronRight className="h-3.5 w-3.5" /></Button>
        <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" disabled={page === totalPages} onClick={() => onPageChange(totalPages)}><ChevronsRight className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  )
}

/* ── Main Component ───────────────────────────────────── */
export function StudentMarksContent() {
  const [marks, setMarks] = useState<StudentMark[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStandard, setFilterStandard] = useState("all")
  const [filterBoard, setFilterBoard] = useState("all")
  const [filterLocation, setFilterLocation] = useState("all")
  const [filterSubject, setFilterSubject] = useState("all")
  const [filterExam, setFilterExam] = useState("all")

  // Pagination
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  // Edit modal
  const [editOpen, setEditOpen] = useState(false)
  const [editItem, setEditItem] = useState<StudentMark | null>(null)
  const [editForm, setEditForm] = useState({
    subject: "", marks: "", total_marks: "", examination: "", exam_date: ""
  })
  const [savingEdit, setSavingEdit] = useState(false)

  // Delete state
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // ── Load ────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [studentsRes, assessmentsRes]: any[] = await Promise.all([
        studentsUniversalApi.getAll(),
        teacherStudentAssessmentsApi.getLatestAll(),
      ])
      const studentMap = new Map<number, any>()
      for (const s of studentsRes?.data || []) {
        studentMap.set(Number(s.id), s)
      }

      const allMarks: StudentMark[] = []
      for (const row of assessmentsRes?.data || []) {
        const student = studentMap.get(Number(row.student_id))
        if (!student) continue
        allMarks.push({
          id: Number(row.id),
          student_id: Number(row.student_id),
          student_name: student.name || "",
          phone: student.phone || "",
          father_phone: student.father_phone || "",
          standard: student.standard || "",
          board: student.board || "",
          location: student.location || "",
          subject: row.subject || "",
          marks: Number(row.marks),
          total_marks: row.total_marks !== undefined && row.total_marks !== null ? Number(row.total_marks) : undefined,
          examination: row.examination || "",
          exam_date: row.exam_date ? String(row.exam_date).split("T")[0] : "",
        })
      }
      setMarks(allMarks)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Derived data ────────────────────────────────────
  const standards = useMemo(() => Array.from(new Set(marks.map(m => m.standard))).filter(Boolean).sort(), [marks])
  const boards = useMemo(() => Array.from(new Set(marks.map(m => m.board))).filter(Boolean).sort(), [marks])
  const locations = useMemo(() => Array.from(new Set(marks.map(m => m.location))).filter(Boolean).sort(), [marks])
  const subjects = useMemo(() => Array.from(new Set(marks.map(m => m.subject))).filter(Boolean).sort(), [marks])
  const exams = useMemo(() => Array.from(new Set(marks.map(m => m.examination))).filter(Boolean).sort(), [marks])

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return marks.filter(m => {
      const matchesSearch = q.length === 0 ||
        m.student_name.toLowerCase().includes(q) ||
        m.phone.toLowerCase().includes(q) ||
        String(m.student_id).includes(q)
      const matchesStd = filterStandard === "all" || m.standard === filterStandard
      const matchesBoard = filterBoard === "all" || m.board === filterBoard
      const matchesLoc = filterLocation === "all" || m.location === filterLocation
      const matchesSub = filterSubject === "all" || m.subject === filterSubject
      const matchesExam = filterExam === "all" || m.examination === filterExam
      return matchesSearch && matchesStd && matchesBoard && matchesLoc && matchesSub && matchesExam
    })
  }, [marks, searchTerm, filterStandard, filterBoard, filterLocation, filterSubject, filterExam])

  useEffect(() => { setPage(1) }, [searchTerm, filterStandard, filterBoard, filterLocation, filterSubject, filterExam])

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])

  // ── Stats ────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalStudents = new Set(marks.map(m => m.student_id)).size
    const totalRecords = marks.length
    const avgMarks = marks.length > 0
      ? Math.round(marks.reduce((sum, m) => sum + m.marks, 0) / marks.length)
      : 0
    const topScorer = marks.length > 0
      ? marks.reduce((best, m) => m.marks > best.marks ? m : best, marks[0])
      : null
    return { totalStudents, totalRecords, avgMarks, topScorer }
  }, [marks])

  // ── Edit ────────────────────────────────────────────
  const openEdit = (item: StudentMark) => {
    setEditItem(item)
    setEditForm({
      subject: item.subject,
      marks: String(item.marks),
      total_marks: item.total_marks !== undefined ? String(item.total_marks) : "",
      examination: item.examination,
      exam_date: item.exam_date
    })
    setEditOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editItem) return
    if (!editForm.subject || !editForm.marks || !editForm.examination || !editForm.exam_date) {
      alert("Please fill all required fields"); return
    }
    const marksNum = Number(editForm.marks)
    if (Number.isNaN(marksNum) || marksNum < 0) { alert("Marks must be a valid non-negative number"); return }
    const totalNum = editForm.total_marks !== "" ? Number(editForm.total_marks) : undefined
    if (totalNum !== undefined && (Number.isNaN(totalNum) || totalNum < 0)) {
      alert("Total marks must be valid"); return
    }
    if (totalNum !== undefined && marksNum > totalNum) {
      alert("Marks cannot exceed total marks"); return
    }

    setSavingEdit(true)
    try {
      await teacherStudentAssessmentsApi.update(editItem.id, {
        subject: editForm.subject,
        marks: marksNum,
        ...(totalNum !== undefined && { total_marks: totalNum }),
        examination: editForm.examination,
        exam_date: editForm.exam_date,
      })
      setMarks(prev => prev.map(m =>
        m.id === editItem.id
          ? {
              ...m,
              subject: editForm.subject,
              marks: marksNum,
              total_marks: totalNum,
              examination: editForm.examination,
              exam_date: editForm.exam_date,
            }
          : m
      ))
      setEditOpen(false)
    } catch (err: any) {
      alert(err.message || "Failed to update")
    } finally {
      setSavingEdit(false)
    }
  }

  // ── Delete ────────────────────────────────────────────
  const handleDelete = async (item: StudentMark) => {
    if (!confirm(`Delete marks for "${item.student_name}" — ${item.subject} (${item.examination})?`)) return
    setDeletingId(item.id)
    try {
      await teacherStudentAssessmentsApi.remove(item.id)
      setMarks(prev => prev.filter(m => m.id !== item.id))
    } catch (err: any) {
      alert(err.message || "Failed to delete")
    } finally {
      setDeletingId(null)
    }
  }

  // ── Export CSV ────────────────────────────────────────
  const handleExport = () => {
    if (!filtered.length) { alert("No data to export"); return }
    const headers = ["Student ID", "Name", "Phone", "Standard", "Board", "Location", "Subject", "Marks", "Total Marks", "Examination", "Exam Date"]
    const rows = filtered.map(m => [
      m.student_id, m.student_name, m.phone, m.standard, m.board, m.location,
      m.subject, m.marks, m.total_marks ?? "", m.examination, m.exam_date
    ])
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
    const csv = [headers, ...rows].map(r => r.map(esc).join(",")).join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = `student_marks_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // ═════════════════════════════════════════════════════
  return (
    <div className="space-y-6 pt-12 lg:pt-0">

      {/* ── Stats Cards ──────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-violet-500 to-purple-600">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-bl-[40px]" />
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-violet-100 text-xs font-medium uppercase tracking-wider">Total Students</p>
                <p className="text-3xl font-bold text-white mt-1">{stats.totalStudents}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-500 to-cyan-600">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-bl-[40px]" />
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs font-medium uppercase tracking-wider">Total Records</p>
                <p className="text-3xl font-bold text-white mt-1">{stats.totalRecords}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-teal-600">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-bl-[40px]" />
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-xs font-medium uppercase tracking-wider">Avg. Marks</p>
                <p className="text-3xl font-bold text-white mt-1">{stats.avgMarks}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-amber-500 to-orange-600">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-bl-[40px]" />
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-xs font-medium uppercase tracking-wider">Top Scorer</p>
                <p className="text-xl font-bold text-white mt-1 truncate max-w-[140px]">
                  {stats.topScorer?.student_name ?? "—"}
                </p>
                {stats.topScorer && (
                  <p className="text-amber-100 text-xs mt-0.5">
                    {stats.topScorer.marks}{stats.topScorer.total_marks ? `/${stats.topScorer.total_marks}` : ""} in {stats.topScorer.subject}
                  </p>
                )}
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                <Award className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Card ──────────────────────────────────── */}
      <Card className="shadow-lg border-0">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              Student Marks
            </CardTitle>
            <Button onClick={handleExport} variant="outline" className="gap-2 rounded-xl hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition-all">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>

          {/* ── Filters ──────────────────────────────── */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-6 items-stretch sm:items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, phone, ID…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 rounded-xl w-full"
              />
            </div>
            <Select value={filterStandard} onValueChange={setFilterStandard}>
              <SelectTrigger className="rounded-xl w-full sm:w-[140px]"><SelectValue placeholder="All Standards" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Standards</SelectItem>
                {standards.map(s => <SelectItem key={s} value={s}>Std {s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterBoard} onValueChange={setFilterBoard}>
              <SelectTrigger className="rounded-xl w-full sm:w-[130px]"><SelectValue placeholder="All Boards" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Boards</SelectItem>
                {boards.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterLocation} onValueChange={setFilterLocation}>
              <SelectTrigger className="rounded-xl w-full sm:w-[140px]"><SelectValue placeholder="All Locations" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger className="rounded-xl w-full sm:w-[130px]"><SelectValue placeholder="All Subjects" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterExam} onValueChange={setFilterExam}>
              <SelectTrigger className="rounded-xl w-full sm:w-[160px]"><SelectValue placeholder="All Examinations" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Examinations</SelectItem>
                {exams.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* ── Table ──────────────────────────────── */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-violet-500" />
              <p className="text-sm text-muted-foreground">Loading student marks…</p>
            </div>
          ) : (
            <div className="rounded-xl border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-slate-900 to-slate-800">
                    <TableHead className="text-white font-semibold w-12 text-center">Sr.</TableHead>
                    <TableHead className="text-white font-semibold">Student Name</TableHead>
                    <TableHead className="text-white font-semibold hidden sm:table-cell">Phone</TableHead>
                    <TableHead className="text-white font-semibold">Std</TableHead>
                    <TableHead className="text-white font-semibold hidden md:table-cell">Board</TableHead>
                    <TableHead className="text-white font-semibold hidden lg:table-cell">Location</TableHead>
                    <TableHead className="text-white font-semibold">Subject</TableHead>
                    <TableHead className="text-white font-semibold text-center">Marks</TableHead>
                    <TableHead className="text-white font-semibold text-center hidden sm:table-cell">Total</TableHead>
                    <TableHead className="text-white font-semibold text-center hidden md:table-cell">Grade</TableHead>
                    <TableHead className="text-white font-semibold hidden lg:table-cell">Examination</TableHead>
                    <TableHead className="text-white font-semibold hidden xl:table-cell">Date</TableHead>
                    <TableHead className="text-white font-semibold text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={13} className="text-center py-16">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center">
                            <BookOpen className="h-8 w-8 text-muted-foreground/50" />
                          </div>
                          <div>
                            <p className="font-medium text-muted-foreground">No marks found</p>
                            <p className="text-sm text-muted-foreground/60 mt-0.5">Try adjusting your filters</p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginated.map((m, index) => {
                      const grade = getGrade(m.marks, m.total_marks)
                      const pct = m.total_marks && m.total_marks > 0
                        ? Math.round((m.marks / m.total_marks) * 100)
                        : null
                      return (
                        <TableRow key={m.id} className="hover:bg-muted/40 transition-colors group">
                          <TableCell className="text-center text-muted-foreground text-sm font-medium">
                            {(page - 1) * pageSize + index + 1}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center text-violet-700 font-bold text-sm shrink-0">
                                {m.student_name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-sm">{m.student_name}</p>
                                <p className="text-xs text-muted-foreground">ID: {m.student_id}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm">{m.phone || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="rounded-lg text-xs font-medium">
                              {m.standard || "—"}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm">{m.board || "—"}</TableCell>
                          <TableCell className="hidden lg:table-cell text-sm">{m.location || "—"}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold">
                              <BookOpen className="h-3 w-3" />
                              {m.subject}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-bold text-base">{m.marks}</span>
                          </TableCell>
                          <TableCell className="text-center hidden sm:table-cell">
                            <span className="text-sm text-muted-foreground">
                              {m.total_marks !== undefined ? m.total_marks : "—"}
                            </span>
                            {pct !== null && (
                              <span className={`block text-[10px] font-semibold mt-0.5 ${
                                pct >= 75 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-red-500"
                              }`}>
                                {pct}%
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center hidden md:table-cell">
                            <Badge className={`${grade.color} border text-xs font-bold px-2.5 py-0.5`}>
                              {grade.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <span className="text-sm">{m.examination || "—"}</span>
                          </TableCell>
                          <TableCell className="hidden xl:table-cell">
                            <span className="text-sm text-muted-foreground">{m.exam_date || "—"}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 rounded-lg text-blue-600 hover:text-blue-700 hover:border-blue-300 hover:bg-blue-50 transition-all"
                                title="Edit marks"
                                onClick={() => openEdit(m)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 rounded-lg text-red-500 hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-all"
                                title="Delete marks"
                                onClick={() => handleDelete(m)}
                                disabled={deletingId === m.id}
                              >
                                {deletingId === m.id
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  : <Trash2 className="h-3.5 w-3.5" />
                                }
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <Pagination
              total={filtered.length}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </CardContent>
      </Card>

      {/* ── Edit Dialog ──────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Pencil className="h-4 w-4 text-white" />
              </div>
              Edit Student Marks
            </DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-4 py-2">
              {/* Student info banner */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-100">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold shrink-0">
                  {editItem.student_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-sm">{editItem.student_name}</p>
                  <p className="text-xs text-muted-foreground">
                    ID: {editItem.student_id} · Std {editItem.standard} · {editItem.board}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Subject <span className="text-red-500">*</span></Label>
                <Input
                  value={editForm.subject}
                  onChange={e => setEditForm(p => ({ ...p, subject: e.target.value }))}
                  placeholder="e.g. Mathematics"
                  className="rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Marks Obtained <span className="text-red-500">*</span></Label>
                  <Input
                    type="number" min={0}
                    value={editForm.marks}
                    onChange={e => setEditForm(p => ({ ...p, marks: e.target.value }))}
                    placeholder="e.g. 87"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Total Marks <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
                  <Input
                    type="number" min={0}
                    value={editForm.total_marks}
                    onChange={e => setEditForm(p => ({ ...p, total_marks: e.target.value }))}
                    placeholder="e.g. 100"
                    className="rounded-xl"
                  />
                </div>
              </div>
              {editForm.marks !== "" && editForm.total_marks !== "" &&
                !Number.isNaN(Number(editForm.marks)) && !Number.isNaN(Number(editForm.total_marks)) &&
                Number(editForm.total_marks) > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 text-xs">
                    <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {((Number(editForm.marks) / Number(editForm.total_marks)) * 100).toFixed(1)}% scored
                    </span>
                    {Number(editForm.marks) > Number(editForm.total_marks) && (
                      <span className="ml-auto text-red-500 font-medium">⚠ Exceeds total</span>
                    )}
                  </div>
                )}
              <div className="space-y-1.5">
                <Label>Examination <span className="text-red-500">*</span></Label>
                <Input
                  value={editForm.examination}
                  onChange={e => setEditForm(p => ({ ...p, examination: e.target.value }))}
                  placeholder="e.g. Unit Test 1"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Date <span className="text-red-500">*</span></Label>
                <Input
                  type="date"
                  value={editForm.exam_date}
                  onChange={e => setEditForm(p => ({ ...p, exam_date: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} className="rounded-xl">Cancel</Button>
            <Button
              onClick={handleSaveEdit}
              disabled={savingEdit}
              className="rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
            >
              {savingEdit && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
