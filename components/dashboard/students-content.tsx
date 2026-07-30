"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { GraduationCap, Search, Eye, Trash2, Phone, User, MapPin, BookOpen, Loader2, IndianRupee, Pencil, FileSpreadsheet, Upload, Key } from "lucide-react"
import { studentsApi, studentsUniversalApi } from "@/lib/api"
import * as XLSX from "xlsx"

interface Student {
  id: number; name: string; email?: string; phone: string; father_name: string; father_phone: string
  board: string; standard: string; course: string; location: string; fee: number; paid_fee: number
  subjects: string[]
}

// ── Subject constants ──────────────────────────────────
const SUBJECTS_JUNIOR = ["English", "Math", "Science", "SST", "All Subjects"]
const SUBJECTS_SENIOR = ["English", "Math", "Physics", "Biology", "Chemistry", "All Subjects"]

// Fee status badge helper
const feeStatus = (s: Student) => {
  const fee  = Number(s.fee)
  const paid = Number(s.paid_fee)
  if (fee === 0)   return { label: "No Fee",  cls: "bg-gray-100 text-gray-500" }
  if (paid >= fee) return { label: "Paid",     cls: "bg-emerald-100 text-emerald-700" }
  if (paid > 0)    return { label: "Partial",  cls: "bg-yellow-100 text-yellow-700" }
  return             { label: "Pending",  cls: "bg-red-100 text-red-700" }
}

export function StudentsContent() {
  const [students,       setStudents]       = useState<Student[]>([])
  const [loading,        setLoading]        = useState(true)
  const [importing,      setImporting]      = useState(false)
  const [searchTerm,     setSearchTerm]     = useState("")
  const [filterStandard, setFilterStandard] = useState("all")
  const [filterBoard,    setFilterBoard]    = useState("all")
  const [filterLocation, setFilterLocation] = useState("all")
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // View modal
  const [selected,  setSelected]  = useState<Student | null>(null)
  const [viewOpen,  setViewOpen]  = useState(false)

  // Update Fee modal
  const [feeStudent,   setFeeStudent]   = useState<Student | null>(null)
  const [feeModalOpen, setFeeModalOpen] = useState(false)
  const [newFee,       setNewFee]       = useState("")
  const [feeSaving,    setFeeSaving]    = useState(false)

  // Pay Fee modal
  const [payStudent,   setPayStudent]   = useState<Student | null>(null)
  const [payModalOpen, setPayModalOpen] = useState(false)
  const [payAmount,    setPayAmount]    = useState("")
  const [payMode,      setPayMode]      = useState<"add" | "set">("add")
  const [paySaving,    setPaySaving]    = useState(false)

  // Set Password modal
  const [passwordStudent, setPasswordStudent] = useState<Student | null>(null)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [currentPlainPassword, setCurrentPlainPassword] = useState<string | null>(null)
  const [fetchingPassword, setFetchingPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  // ── Load ───────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const filters = {
        standard: filterStandard !== "all" ? filterStandard : undefined,
        board:    filterBoard    !== "all" ? filterBoard    : undefined,
        location: filterLocation !== "all" ? filterLocation : undefined,
        search:   searchTerm || undefined,
      }
      try {
        const universal: any = await studentsUniversalApi.getAll(filters)
        const rows = universal?.data || []
        setStudents(rows.map((r: any) => ({
          ...r,
          subjects: r.subjects
            ? (Array.isArray(r.subjects) ? r.subjects : String(r.subjects).split(",").filter(Boolean))
            : [],
        })))
      } catch {
        const primary: any = await studentsApi.getAll(filters)
        const rows = primary?.data || []
        setStudents(rows.map((r: any) => ({
          ...r,
          subjects: r.subjects
            ? (Array.isArray(r.subjects) ? r.subjects : String(r.subjects).split(",").filter(Boolean))
            : [],
        })))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [filterStandard, filterBoard, filterLocation, searchTerm])

  useEffect(() => { load() }, [load])

  // ── Delete ─────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    if (!confirm("Delete this student?")) return
    try {
      await studentsApi.remove(id)
      setStudents(prev => prev.filter(s => s.id !== id))
    } catch (err: any) { alert(err.message) }
  }

  // ── Update Fee ─────────────────────────────────────────
  const openFeeModal = (s: Student) => {
    setFeeStudent(s); setNewFee(String(Number(s.fee))); setFeeModalOpen(true)
  }
  const handleUpdateFee = async () => {
    if (!feeStudent) return
    const val = parseFloat(newFee)
    if (isNaN(val) || val < 0) { alert("Enter a valid fee amount"); return }
    setFeeSaving(true)
    try {
      await studentsApi.update(feeStudent.id, { ...feeStudent, fee: val, subjects: feeStudent.subjects.join(",") })
      setStudents(prev => prev.map(s => s.id === feeStudent.id ? { ...s, fee: val } : s))
      setFeeModalOpen(false)
    } catch (err: any) { alert(err.message) }
    finally { setFeeSaving(false) }
  }

  // ── Pay Fee ────────────────────────────────────────────
  const openPayModal = (s: Student) => {
    setPayStudent(s); setPayAmount(""); setPayMode("add"); setPayModalOpen(true)
  }
  const handlePayFee = async () => {
    if (!payStudent) return
    const val = parseFloat(payAmount)
    if (isNaN(val) || val < 0) { alert("Enter a valid amount"); return }
    const newPaid = payMode === "add" ? Number(payStudent.paid_fee) + val : val
    const totalFee = Number(payStudent.fee)
    if (totalFee > 0 && newPaid > totalFee) {
      alert(`Paid amount (₹${newPaid.toLocaleString()}) cannot exceed total fee (₹${totalFee.toLocaleString()})`); return
    }
    setPaySaving(true)
    try {
      await studentsApi.update(payStudent.id, { ...payStudent, paid_fee: newPaid, subjects: payStudent.subjects.join(",") })
      setStudents(prev => prev.map(s => s.id === payStudent.id ? { ...s, paid_fee: newPaid } : s))
      setPayModalOpen(false)
    } catch (err: any) { alert(err.message) }
    finally { setPaySaving(false) }
  }

  // ── Set Password ───────────────────────────────────────
  const openPasswordModal = async (s: Student) => {
    setPasswordStudent(s)
    setNewPassword("")
    setCurrentPlainPassword(null)
    setShowPassword(false)
    setIsResetting(false)
    setPasswordModalOpen(true)
    setFetchingPassword(true)

    try {
      const data = await studentsApi.getPassword(s.id)
      if (data.success && data.plainTextPassword) {
        setCurrentPlainPassword(data.plainTextPassword)
      } else {
        setCurrentPlainPassword("Unencrypted or Not set")
      }
    } catch {
      setCurrentPlainPassword("Error fetching password")
    } finally {
      setFetchingPassword(false)
    }
  }

  const handleSetPassword = async () => {
    if (!passwordStudent) return
    if (!newPassword || newPassword.length < 6) {
      alert("Password must be at least 6 characters"); return
    }
    setPasswordSaving(true)
    try {
      const data = await studentsApi.resetPassword(passwordStudent.id, { password: newPassword })
      if (!data.success) throw new Error(data.message || "Failed to set password")
      
      alert("Password updated successfully!")
      setPasswordModalOpen(false)
    } catch (err: any) { alert(err.message) }
    finally { setPasswordSaving(false) }
  }

  // ── Export ─────────────────────────────────────────────
  const handleExportExcel = () => {
    if (!students.length) { alert("No students to export"); return }
    const headers = ["ID","Name","Phone","Father Name","Father Phone","Board","Standard",
      "Course","Location","Subjects","Total Fee","Paid Fee","Balance","Fee Status"]
    const rows = students.map(s => {
      const totalFee = Number(s.fee || 0)
      const paidFee  = Number(s.paid_fee || 0)
      return [
        s.id, s.name, s.phone, s.father_name, s.father_phone,
        s.board, s.standard, s.course, s.location,
        s.subjects?.join(", ") || "",
        totalFee, paidFee, Math.max(totalFee - paidFee, 0), feeStatus(s).label,
      ]
    })
    const esc = (v: string | number) => `"${String(v).replace(/"/g, "\"\"")}"`
    const csv  = [headers, ...rows].map(r => r.map(esc).join(",")).join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a")
    a.href = url; a.download = `students_${new Date().toISOString().slice(0,10)}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
  }

  // ── Import ─────────────────────────────────────────────
  const normalizeHeader = (v: unknown) =>
    String(v || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")

  const pickValue = (row: Record<string, unknown>, keys: string[]) => {
    for (const key of keys) {
      const val = row[key]
      if (val !== undefined && val !== null && String(val).trim() !== "") return val
    }
    return ""
  }

 const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0]
  if (!file) return
  setImporting(true)
  try {
    const buffer   = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: "array" })
    const sheet    = workbook.Sheets[workbook.SheetNames[0]]
    const rawRows  = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" })
    if (!rawRows.length) { alert("Excel sheet is empty"); return }

    const normalizedRows = rawRows.map(row => {
      const next: Record<string, unknown> = {}
      Object.entries(row).forEach(([k, v]) => { next[normalizeHeader(k)] = v })
      return next
    })

    const payloads = normalizedRows.map(row => {
      const name = String(pickValue(row, ["name", "student_name", "student"])).trim()
      if (!name) return null
      return {
        name,
        email:        String(pickValue(row, ["email"])).trim(),
        phone:        String(pickValue(row, ["phone", "student_phone", "mobile", "contact"])).trim(),
        father_name:  String(pickValue(row, ["father_name", "parent_name", "guardian_name"])).trim(),
        father_phone: String(pickValue(row, ["father_phone", "parent_phone", "guardian_phone"])).trim(),
        board:        String(pickValue(row, ["board"])).trim(),
        standard:     String(pickValue(row, ["standard", "std", "class"])).trim(),
        course:       String(pickValue(row, ["course", "batch"])).trim(),
        location:     String(pickValue(row, ["location", "branch"])).trim(),
        institute:    String(pickValue(row, ["institute", "school", "college"])).trim(),
        subjects:     String(pickValue(row, ["subjects", "subject"])).trim(),
        fee:          Number(pickValue(row, ["fee", "total_fee"])) || 0,
        paid_fee:     Number(pickValue(row, ["paid_fee", "paid", "paidamount"])) || 0,
      }
    }).filter(Boolean) as Array<Record<string, unknown>>

    if (!payloads.length) { alert("No valid student rows found. Add at least a Name column."); return }

    // ── Build lookup set from already-loaded students ──────────────
    // Key: "name|phone" (both lowercased/trimmed) — matches existing records
    const existingKeys = new Set(
      students.map(s =>
        `${s.name.trim().toLowerCase()}|${String(s.phone || "").trim()}`
      )
    )

    // ── Split into new vs duplicate ────────────────────────────────
    const toInsert: Array<Record<string, unknown>> = []
    const skipped:  string[] = []

    for (const p of payloads) {
      const key = `${String(p.name).trim().toLowerCase()}|${String(p.phone || "").trim()}`
      if (existingKeys.has(key)) {
        // Already exists — skip this row
        skipped.push(String(p.name))
      } else {
        // New student — queue for insert
        toInsert.push(p)
        // Add to set immediately so duplicate rows WITHIN the same
        // Excel file are also caught (e.g. same student listed twice)
        existingKeys.add(key)
      }
    }

    if (!toInsert.length) {
      alert(`Nothing imported — all ${skipped.length} rows already exist in the system.`)
      return
    }

    // ── Insert only the non-duplicates ─────────────────────────────
    const results = await Promise.allSettled(toInsert.map(p => studentsApi.create(p)))
    const ok  = results.filter(r => r.status === "fulfilled").length
    const bad = results.length - ok

    await load()

    // ── Clear & show summary ───────────────────────────────────────
    const parts: string[] = []
    if (ok)           parts.push(`✅ ${ok} student${ok !== 1 ? "s" : ""} imported`)
    if (bad)          parts.push(`❌ ${bad} failed`)
    if (skipped.length) parts.push(`⚠️ ${skipped.length} skipped (duplicate)`)
    alert(parts.join("\n"))

  } catch (err: any) {
    alert(err.message || "Failed to import Excel file")
  } finally {
    setImporting(false)
    event.target.value = ""
  }
}
  // ── Subject toggle (used in view modal edit — inline state) ──
  // We keep a local edit state only for subjects inside the view modal
  const [editSubjects,    setEditSubjects]    = useState<string[]>([])
  const [subjectSaving,   setSubjectSaving]   = useState(false)
  const [subjectEditOpen, setSubjectEditOpen] = useState(false)
  const [subjectStudent,  setSubjectStudent]  = useState<Student | null>(null)

  const openSubjectModal = (s: Student) => {
    setSubjectStudent(s)
    setEditSubjects(s.subjects || [])
    setSubjectEditOpen(true)
  }

  const toggleSubject = (subject: string) => {
    setEditSubjects(prev => {
      if (subject === "All Subjects") {
        return prev.includes("All Subjects") ? [] : ["All Subjects"]
      }
      const without = prev.filter(s => s !== "All Subjects")
      return without.includes(subject)
        ? without.filter(s => s !== subject)
        : [...without, subject]
    })
  }

  const handleSaveSubjects = async () => {
    if (!subjectStudent) return
    setSubjectSaving(true)
    try {
      await studentsApi.update(subjectStudent.id, {
        ...subjectStudent,
        subjects: editSubjects.join(","),
      })
      setStudents(prev => prev.map(s =>
        s.id === subjectStudent.id ? { ...s, subjects: editSubjects } : s
      ))
      // Sync view modal if open
      if (selected?.id === subjectStudent.id) {
        setSelected(prev => prev ? { ...prev, subjects: editSubjects } : prev)
      }
      setSubjectEditOpen(false)
    } catch (err: any) { alert(err.message) }
    finally { setSubjectSaving(false) }
  }

  const isSeniorStd = (std: string) => std === "11th" || std === "12th" || std === "11" || std === "12"

  // ═══════════════════════════════════════════════════════
  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
            <GraduationCap className="h-6 w-6" /> Students Management
          </CardTitle>
        </CardHeader>
        <CardContent>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name or phone…" value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Select value={filterStandard} onValueChange={setFilterStandard}>
              <SelectTrigger><SelectValue placeholder="All Standards" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Standards</SelectItem>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i+1} value={String(i+1)}>{i+1}th Standard</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterBoard} onValueChange={setFilterBoard}>
              <SelectTrigger><SelectValue placeholder="All Boards" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Boards</SelectItem>
                <SelectItem value="CBSE">CBSE</SelectItem>
                <SelectItem value="ICSE">ICSE</SelectItem>
                <SelectItem value="State">State Board</SelectItem>
                <SelectItem value="IB">IB</SelectItem>
                <SelectItem value="Cambridge">Cambridge Board</SelectItem>
                <SelectItem value="IGCSE">IGCSE</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterLocation} onValueChange={setFilterLocation}>
              <SelectTrigger><SelectValue placeholder="All Locations" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="Akurdi">Akurdi</SelectItem><SelectItem value="Balaji Nagar">Balaji Nagar</SelectItem><SelectItem value="Ravet">Ravet</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end mb-4">
            <div className="flex items-center gap-2">
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv"
                onChange={handleImportExcel} className="hidden" />
              <Button onClick={() => fileInputRef.current?.click()} variant="outline" disabled={importing}>
                {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Import Excel
              </Button>
              <Button onClick={handleExportExcel} variant="outline">
                <FileSpreadsheet className="h-4 w-4 mr-2" /> Export Excel
              </Button>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-900">
                    <TableHead className="text-white font-semibold w-12 text-center">Sr.</TableHead>
                    <TableHead className="text-white font-semibold">Name</TableHead>
                    <TableHead className="text-white font-semibold hidden sm:table-cell">Phone</TableHead>
                    <TableHead className="text-white font-semibold hidden md:table-cell">Father Name</TableHead>
                    <TableHead className="text-white font-semibold hidden lg:table-cell">Board</TableHead>
                    <TableHead className="text-white font-semibold">Std</TableHead>
                    <TableHead className="text-white font-semibold hidden md:table-cell">Location</TableHead>
                    <TableHead className="text-white font-semibold hidden xl:table-cell">Subjects</TableHead>
                    <TableHead className="text-white font-semibold hidden lg:table-cell">Total Fee</TableHead>
                    <TableHead className="text-white font-semibold hidden lg:table-cell">Paid</TableHead>
                    <TableHead className="text-white font-semibold hidden sm:table-cell">Status</TableHead>
                    <TableHead className="text-white font-semibold text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                        No students found
                      </TableCell>
                    </TableRow>
                  ) : students.map((s, index) => {
                    const { label, cls } = feeStatus(s)
                    return (
                      <TableRow key={s.id} className="hover:bg-muted/50">
                        <TableCell className="text-center text-muted-foreground text-sm font-medium">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="hidden sm:table-cell">{s.phone}</TableCell>
                        <TableCell className="hidden md:table-cell">{s.father_name}</TableCell>
                        <TableCell className="hidden lg:table-cell">{s.board}</TableCell>
                        <TableCell>{s.standard}</TableCell>
                        <TableCell className="hidden md:table-cell">{s.location}</TableCell>

                        {/* Subjects column */}
                        <TableCell className="hidden xl:table-cell max-w-[180px]">
                          {s.subjects?.length ? (
                            <div className="flex flex-wrap gap-1">
                              {s.subjects.map(sub => (
                                <span key={sub}
                                  className="px-1.5 py-0.5 rounded bg-green-50 border border-green-200 text-green-700 text-[10px] font-semibold whitespace-nowrap">
                                  {sub}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>

                        <TableCell className="hidden lg:table-cell font-medium">
                          ₹{Number(s.fee).toLocaleString()}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-emerald-600 font-medium">
                          ₹{Number(s.paid_fee).toLocaleString()}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge className={cls}>{label}</Badge>
                        </TableCell>

                        {/* Actions */}
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0"
                              title="View details"
                              onClick={() => { setSelected(s); setViewOpen(true) }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline"
                              className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:border-green-300"
                              title="Edit subjects"
                              onClick={() => openSubjectModal(s)}>
                              <BookOpen className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline"
                              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:border-blue-300"
                              title="Update total fee"
                              onClick={() => openFeeModal(s)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline"
                              className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:border-emerald-300"
                              title="Record payment"
                              onClick={() => openPayModal(s)}>
                              <IndianRupee className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline"
                              className="h-8 w-8 p-0 text-purple-600 hover:text-purple-700 hover:border-purple-300"
                              title="Manage Password"
                              onClick={() => openPasswordModal(s)}>
                              <Key className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="destructive" className="h-8 w-8 p-0"
                              onClick={() => handleDelete(s.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── View Modal ────────────────────────────────────── */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" /> Student Details
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              {[
                { icon: User,     label: "Name",             value: selected.name },
                { icon: Phone,    label: "Phone",            value: selected.phone },
                { icon: User,     label: "Father Name",      value: selected.father_name },
                { icon: Phone,    label: "Father Phone",     value: selected.father_phone },
                { icon: BookOpen, label: "Board / Standard", value: `${selected.board} – ${selected.standard}th` },
                { icon: MapPin,   label: "Location",         value: selected.location },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="font-medium">{value}</p>
                  </div>
                </div>
              ))}

              {/* Subjects in view modal */}
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground font-medium">Subjects</p>
                  <button
                    onClick={() => { setViewOpen(false); openSubjectModal(selected) }}
                    className="text-xs text-green-600 hover:text-green-700 font-semibold flex items-center gap-1">
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                </div>
                {selected.subjects?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selected.subjects.map(sub => (
                      <span key={sub}
                        className="px-2.5 py-1 rounded-full bg-green-100 border border-green-200 text-green-700 text-xs font-semibold">
                        {sub}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No subjects assigned</p>
                )}
              </div>

              {/* Fee summary */}
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <p className="text-sm text-muted-foreground font-medium">Fee Summary</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-background rounded-lg p-2">
                    <p className="text-xs text-muted-foreground">Total Fee</p>
                    <p className="font-bold text-sm">₹{Number(selected.fee).toLocaleString()}</p>
                  </div>
                  <div className="bg-background rounded-lg p-2">
                    <p className="text-xs text-muted-foreground">Paid</p>
                    <p className="font-bold text-sm text-emerald-600">₹{Number(selected.paid_fee).toLocaleString()}</p>
                  </div>
                  <div className="bg-background rounded-lg p-2">
                    <p className="text-xs text-muted-foreground">Balance</p>
                    <p className="font-bold text-sm text-red-500">
                      ₹{(Number(selected.fee) - Number(selected.paid_fee)).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="w-full bg-muted-foreground/20 rounded-full h-2 mt-1">
                  <div className="bg-emerald-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min((Number(selected.paid_fee) / (Number(selected.fee) || 1)) * 100, 100)}%` }} />
                </div>
                <p className="text-xs text-right text-muted-foreground">
                  {Number(selected.fee) > 0
                    ? `${Math.round((Number(selected.paid_fee) / Number(selected.fee)) * 100)}% paid`
                    : "No fee set"}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Edit Subjects Modal ───────────────────────────── */}
      <Dialog open={subjectEditOpen} onOpenChange={setSubjectEditOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-green-600" /> Edit Subjects
            </DialogTitle>
          </DialogHeader>

          {subjectStudent && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold shrink-0">
                  {subjectStudent.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-sm">{subjectStudent.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {subjectStudent.standard && `Std ${subjectStudent.standard}`}
                    {subjectStudent.course && ` · ${subjectStudent.course}`}
                    {" · "}
                    <span className="text-green-600 font-medium">
                      {isSeniorStd(subjectStudent.standard) ? "11th–12th list" : "1st–10th list"}
                    </span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {(isSeniorStd(subjectStudent.standard) ? SUBJECTS_SENIOR : SUBJECTS_JUNIOR).map(subject => {
                  const checked = editSubjects.includes(subject)
                  const isAll   = subject === "All Subjects"
                  return (
                    <button
                      key={subject}
                      type="button"
                      onClick={() => toggleSubject(subject)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all text-left
                        ${isAll ? "col-span-2" : ""}
                        ${isAll
                          ? checked
                            ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                            : "border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600"
                          : checked
                            ? "border-green-500 bg-green-50 text-green-700 shadow-sm"
                            : "border-gray-200 text-gray-600 hover:border-green-400 hover:bg-green-50/50"
                        }`}
                    >
                      <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border-2 transition-colors
                        ${checked
                          ? isAll ? "bg-white border-white" : "bg-green-500 border-green-500"
                          : "border-gray-300"}`}
                      >
                        {checked && (
                          <svg className={`w-2.5 h-2.5 ${isAll ? "text-blue-600" : "text-white"}`}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      {subject}
                    </button>
                  )
                })}
              </div>

              {editSubjects.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {editSubjects.map(s => (
                    <span key={s}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                      {s}
                      <button type="button" onClick={() => toggleSubject(s)}
                        className="hover:text-red-500 transition-colors ml-0.5">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {editSubjects.length === 0 && (
                <p className="text-xs text-muted-foreground italic text-center py-1">No subjects selected</p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSubjectEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSubjects} disabled={subjectSaving}
              className="bg-green-600 hover:bg-green-700">
              {subjectSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Subjects
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Update Fee Modal ──────────────────────────────── */}
      <Dialog open={feeModalOpen} onOpenChange={setFeeModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-blue-600" /> Update Total Fee
            </DialogTitle>
          </DialogHeader>
          {feeStudent && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0">
                  {feeStudent.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-sm">{feeStudent.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {feeStudent.standard && `Std ${feeStudent.standard}`}
                    {feeStudent.course && ` · ${feeStudent.course}`}
                  </p>
                </div>
              </div>
              <div className="flex justify-between text-sm px-1">
                <span className="text-muted-foreground">Current Fee</span>
                <span className="font-semibold">₹{Number(feeStudent.fee).toLocaleString()}</span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-fee">New Total Fee (₹) <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                  <Input id="new-fee" type="number" min="0" value={newFee}
                    onChange={e => setNewFee(e.target.value)}
                    placeholder="Enter new fee amount" className="pl-7" autoFocus />
                </div>
                {newFee && (
                  <p className="text-xs text-muted-foreground px-1">
                    Balance after update:{" "}
                    <span className="font-medium text-foreground">
                      ₹{Math.max(0, parseFloat(newFee) - Number(feeStudent.paid_fee)).toLocaleString()}
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeeModalOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateFee} disabled={feeSaving} className="bg-blue-600 hover:bg-blue-700">
              {feeSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Fee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Pay Fee Modal ─────────────────────────────────── */}
      <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-emerald-600" /> Record Payment
            </DialogTitle>
          </DialogHeader>
          {payStudent && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold shrink-0">
                  {payStudent.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-sm">{payStudent.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {payStudent.standard && `Std ${payStudent.standard}`}
                    {payStudent.course && ` · ${payStudent.course}`}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border p-2">
                  <p className="text-xs text-muted-foreground">Total Fee</p>
                  <p className="font-bold text-sm">₹{Number(payStudent.fee).toLocaleString()}</p>
                </div>
                <div className="rounded-lg border p-2">
                  <p className="text-xs text-muted-foreground">Paid</p>
                  <p className="font-bold text-sm text-emerald-600">₹{Number(payStudent.paid_fee).toLocaleString()}</p>
                </div>
                <div className="rounded-lg border p-2">
                  <p className="text-xs text-muted-foreground">Balance</p>
                  <p className="font-bold text-sm text-red-500">
                    ₹{(Number(payStudent.fee) - Number(payStudent.paid_fee)).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Payment Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setPayMode("add")}
                    className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                      payMode === "add"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "border-border text-muted-foreground hover:border-emerald-400"
                    }`}>+ Add Payment</button>
                  <button onClick={() => setPayMode("set")}
                    className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                      payMode === "set"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-border text-muted-foreground hover:border-blue-400"
                    }`}>= Set Total Paid</button>
                </div>
                <p className="text-xs text-muted-foreground px-1">
                  {payMode === "add"
                    ? "Adds this amount on top of the existing paid amount"
                    : "Sets the paid_fee column to exactly this value"}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-amount">
                  {payMode === "add" ? "Payment Amount (₹)" : "Set Paid Amount (₹)"}
                  <span className="text-destructive"> *</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                  <Input id="pay-amount" type="number" min="0" value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    placeholder={payMode === "add" ? "Amount being paid now" : "Total amount paid so far"}
                    className="pl-7" autoFocus />
                </div>
                {payAmount && !isNaN(parseFloat(payAmount)) && (
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 space-y-1">
                    <p className="text-xs font-medium text-emerald-700">After this update:</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Paid will become</span>
                      <span className="font-bold text-emerald-700">
                        ₹{(payMode === "add"
                          ? Number(payStudent.paid_fee) + parseFloat(payAmount)
                          : parseFloat(payAmount)
                        ).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Balance will be</span>
                      <span className="font-bold text-red-500">
                        ₹{Math.max(0,
                          Number(payStudent.fee) - (payMode === "add"
                            ? Number(payStudent.paid_fee) + parseFloat(payAmount)
                            : parseFloat(payAmount))
                        ).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayModalOpen(false)}>Cancel</Button>
            <Button onClick={handlePayFee} disabled={paySaving} className="bg-emerald-600 hover:bg-emerald-700">
              {paySaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ── Manage Password Modal ────────────────────────────── */}
      <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-purple-600" /> Manage Password
            </DialogTitle>
          </DialogHeader>
          {passwordStudent && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold shrink-0">
                  {passwordStudent.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-sm">{passwordStudent.name}</p>
                  <p className="text-xs text-muted-foreground">{passwordStudent.email || passwordStudent.phone}</p>
                </div>
              </div>

              {!isResetting ? (
                <div className="space-y-4">
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                    <p className="text-sm font-medium text-purple-800 mb-2">Current Login Password</p>
                    {fetchingPassword ? (
                      <div className="flex items-center gap-2 text-sm text-purple-600">
                        <Loader2 className="w-4 h-4 animate-spin" /> Fetching...
                      </div>
                    ) : (
                      <div className="flex items-center justify-between bg-white p-3 rounded border">
                        <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded select-all text-gray-800">
                          {showPassword ? currentPlainPassword : "••••••••"}
                        </code>
                        <Button variant="ghost" size="sm" className="h-8" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? "Hide" : "Show"}
                        </Button>
                      </div>
                    )}
                  </div>
                  <Button variant="outline" className="w-full text-purple-600 border-purple-200 hover:bg-purple-50" onClick={() => setIsResetting(true)}>
                    Reset Password
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                  <Label htmlFor="new-password">New Password <span className="text-destructive">*</span></Label>
                  <Input id="new-password" type="password" value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Enter a secure password (min 6 chars)" autoFocus />
                  <p className="text-xs text-muted-foreground px-1">
                    The student will be forced to change this password on their next login.
                  </p>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" className="flex-1" onClick={() => { setIsResetting(false); setNewPassword(""); }}>
                      Cancel Reset
                    </Button>
                    <Button onClick={handleSetPassword} disabled={passwordSaving} className="flex-1 bg-purple-600 hover:bg-purple-700">
                      {passwordSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Save New Password
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          {!isResetting && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setPasswordModalOpen(false)}>Close</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}