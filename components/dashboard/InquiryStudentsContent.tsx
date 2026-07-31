"use client"

import { useState, useEffect, useCallback } from "react"
import { inquiryExtraApi } from "@/lib/api"

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface Inquiry {
  id: number
  studentName: string
  dob: string
  studentContact: string
  parentContact: string
  batch: string
  standard: string
  lastExamMarks: string
  collegeName: string
  collegeTiming: string
  fatherOccupation: string
  motherOccupation: string
  address: string
  branch: string
  subjects: string[]
  email: string
  futurePlans: string
  reference: string
  siblingName: string
  sex: string
  takingCoaching: string
  hostelRequired: string
  status: string
  feedback1: string
  feedback2: string
  notes: string
  created_at: string
}

interface InquiryExtraRow {
  id: number
  name: string
  phone: string
  father_name: string
  father_phone: string
  course: string
  location: string 
  board: string
  standard: string
  status: string
  video: string
  dob: string
  email: string
  address: string
  branch: string
  subjects: string 
  college_name: string
  college_timing: string
  last_exam_marks: string
  father_occupation: string
  mother_occupation: string
  future_plans: string
  reference: string
  sibling_name: string
  sex: string
  taking_coaching: string
  hostel_required: string
  feedback1: string
  feedback2: string
  notes: string
  admin_id: number
  inquiry_date: string
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const EMPTY_FORM = {
  name: "", phone: "", father_name: "", father_phone: "", dob: "", sex: "",
  email: "", address: "", branch: "",  subjects: [] as string[],
  standard: "", course: "", board: "", last_exam_marks: "", college_name: "", college_timing: "",
  future_plans: "", father_occupation: "", mother_occupation: "", sibling_name: "",
  reference: "", taking_coaching: "", hostel_required: "",
  status: "Pending", feedback1: "", feedback2: "", notes: "",
}

const REF_BADGE: Record<string, string> = {
  "Social Media (Instagram/Facebook)": "bg-pink-100 text-pink-700 border-pink-200",
  "Google":    "bg-blue-100 text-blue-700 border-blue-200",
  "Hoarding":  "bg-purple-100 text-purple-700 border-purple-200",
  "Website":   "bg-cyan-100 text-cyan-700 border-cyan-200",
  "Justdial":  "bg-orange-100 text-orange-700 border-orange-200",
  "Friends":   "bg-green-100 text-green-700 border-green-200",
  "Pamphlets": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Other":     "bg-gray-100 text-gray-600 border-gray-200",
}

const STATUS_STYLES: Record<string, string> = {
  Confirmed: "bg-green-50 border-green-200 text-green-700",
  Pending:   "bg-yellow-50 border-yellow-300 text-yellow-700",
  Maybe:     "bg-blue-50 border-blue-200 text-blue-600",
}

const STATUS_DOT: Record<string, string> = {
  Confirmed: "bg-green-500",
  Pending:   "bg-yellow-400",
  Maybe:     "bg-blue-400",
}

const SUBJECTS_JUNIOR = ["English", "Math", "Science", "SST", "All Subjects"]
const SUBJECTS_SENIOR = ["English", "Math", "Physics", "Biology", "Chemistry", "All Subjects"]

const DRAWER_STYLES = `
  @keyframes slideInRight {
    from { transform: translateX(100%); }
    to   { transform: translateX(0); }
  }
  @keyframes slideOutRight {
    from { transform: translateX(0); }
    to   { transform: translateX(100%); }
  }
  @keyframes fadeInBg {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  .drawer-in  { animation: slideInRight  0.32s cubic-bezier(0.22,1,0.36,1) forwards; }
  .drawer-out { animation: slideOutRight 0.26s cubic-bezier(0.55,0,1,0.45) forwards; }
  .fade-in-bg { animation: fadeInBg 0.25s ease forwards; }
`

// ─────────────────────────────────────────────
// Helper: map Inquiry → form shape
// ─────────────────────────────────────────────
function inquiryToForm(inq: Inquiry) {
  return {
    name:              inq.studentName,
    phone:             inq.studentContact,
    father_name:       "",               // store father_name in Inquiry if needed
    father_phone:      inq.parentContact,
    dob:               inq.dob,
    sex:               inq.sex,
    email:             inq.email,
    address:           inq.address,
    branch:            inq.branch,
    subjects:          inq.subjects || [],
    standard:          inq.standard,
    course:            "",
    board:             inq.batch,
    last_exam_marks:   inq.lastExamMarks,
    college_name:      inq.collegeName,
    college_timing:    inq.collegeTiming,
    future_plans:      inq.futurePlans,
    father_occupation: inq.fatherOccupation,
    mother_occupation: inq.motherOccupation,
    sibling_name:      inq.siblingName,
    reference:         inq.reference,
    taking_coaching:   inq.takingCoaching,
    hostel_required:   inq.hostelRequired,
    status:            inq.status,
    feedback1:         inq.feedback1,
    feedback2:         inq.feedback2,
    notes:             inq.notes,
  }
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export function InquiryStudentsContent() {
  const [inquiries, setInquiries]           = useState<Inquiry[]>([])
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState("")
  const [search, setSearch]                 = useState("")
  const [selected, setSelected]             = useState<Inquiry | null>(null)
  const [filterSex, setFilterSex]           = useState("")
  const [filterBatch, setFilterBatch]       = useState("")
  const [filterStatus, setFilterStatus]     = useState("")

  // Drawer (shared Add / Edit)
  const [drawerMounted, setDrawerMounted]   = useState(false)
  const [drawerOpen, setDrawerOpen]         = useState(false)
  const [editingId, setEditingId]           = useState<number | null>(null)
  const [formData, setFormData]             = useState(EMPTY_FORM)
  const [formLoading, setFormLoading]       = useState(false)
  const [formError, setFormError]           = useState("")
  const [formSuccess, setFormSuccess]       = useState("")

  // Responsive
  const [isMobile, setIsMobile]             = useState(false)

  // ── Fetch ──
  const fetchInquiries = useCallback(async () => {
    setLoading(true); setError("")
    try {
      const data: any = await inquiryExtraApi.getAll()
      if (data.success) {
        const mapped: Inquiry[] = (data.data || []).map((row: InquiryExtraRow) => ({
          id:               row.id,
          studentName:      row.name || "",
          dob:              row.dob || "",
          studentContact:   row.phone || "",
          parentContact:    row.father_phone || "",
          batch:            row.board || row.course || "",
          standard:         row.standard || "",
          lastExamMarks:    row.last_exam_marks || "",
          collegeName:      row.college_name || "",
          collegeTiming:    row.college_timing || "",
          fatherOccupation: row.father_occupation || "",
          motherOccupation: row.mother_occupation || "",
          address:          row.address || "",
          branch:           row.branch || "",
          subjects:         row.subjects ? row.subjects.split(",").filter(Boolean) : [],
          email:            row.email || "",
          futurePlans:      row.future_plans || "",
          reference:        row.reference || "",
          siblingName:      row.sibling_name || "",
          sex:              row.sex || "",
          takingCoaching:   row.taking_coaching || "",
          hostelRequired:   row.hostel_required || "",
          status:           row.status || "Pending",
          feedback1:        row.feedback1 || "",
          feedback2:        row.feedback2 || "",
          notes:            row.notes || "",
          created_at:       row.inquiry_date || "",
        }))
        setInquiries(mapped)
      } else {
        setError(data.message || "Failed to load inquiries")
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchInquiries() }, [fetchInquiries])

  // ── Delete ──
  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this inquiry? This action cannot be undone.")) return
    try {
      const data: any = await inquiryExtraApi.remove(id) 
      if (data.success) {
        setInquiries(prev => prev.filter(i => i.id !== id))
        if (selected?.id === id) setSelected(null)
      } else {
        alert(data.message || "Failed to delete inquiry.")
      }
    } catch {
      alert("Network error. Please try again.")
    }
  }

  // ── Responsive listener ──
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  // ── Drawer helpers ──
  const openAddDrawer = () => {
    setEditingId(null); setFormData(EMPTY_FORM)
    setFormError(""); setFormSuccess("")
    setDrawerMounted(true)
    requestAnimationFrame(() => setDrawerOpen(true))
  }

  const openEditDrawer = (inq: Inquiry) => {
    setEditingId(inq.id); setFormData(inquiryToForm(inq))
    setFormError(""); setFormSuccess("")
    setSelected(null)
    setDrawerMounted(true)
    requestAnimationFrame(() => setDrawerOpen(true))
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
    setTimeout(() => {
      setDrawerMounted(false); setFormData(EMPTY_FORM)
      setEditingId(null); setFormError(""); setFormSuccess("")
    }, 280)
  }

  


  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))

  // ── Submit (Add or Edit) ──
  const handleSubmit = async () => {
    setFormError(""); setFormSuccess("")
    if (!formData.name.trim())     return setFormError("Student name is required.")
    if (!formData.phone.trim())    return setFormError("Student contact is required.")
    if (!formData.standard.trim()) return setFormError("Standard is required.")

    setFormLoading(true)
    try {
      let data: any
      if (editingId !== null) {
        data = await inquiryExtraApi.update(editingId, formData)
      } else {
        data = await inquiryExtraApi.create({ ...formData, inquiry_date: new Date().toISOString() })
      }
      if (data.success) {
        setFormSuccess(editingId ? "Inquiry updated successfully!" : "Inquiry added successfully!")
        await fetchInquiries()
        setTimeout(() => closeDrawer(), 1200)
      } else {
        setFormError(data.message || "Operation failed.")
      }
    } catch {
      setFormError("Network error. Please try again.")
    } finally {
      setFormLoading(false)
    }
  }

  // ── Inline status change ──
  const handleStatusChange = async (id: number, newStatus: string) => {
    setInquiries(prev => prev.map(i => i.id === id ? { ...i, status: newStatus } : i))
    try { await inquiryExtraApi.update(id, { status: newStatus }) }
    catch { fetchInquiries() }
  }

  // ── Filter ──
  const filtered = inquiries.filter(i => {
    const q = search.toLowerCase()
    const matchSearch =
      i.studentName?.toLowerCase().includes(q) ||
      i.studentContact?.includes(q) ||
      i.email?.toLowerCase().includes(q) ||
      i.standard?.toLowerCase().includes(q) ||
      i.branch?.toLowerCase().includes(q)
    return matchSearch
      && (filterSex    ? i.sex === filterSex       : true)
      && (filterBatch  ? i.batch === filterBatch   : true)
      && (filterStatus ? i.status === filterStatus : true)
  })

  // ── Export ──
  const handleExportExcel = () => {
    if (!filtered.length) { alert("No inquiries to export"); return }
    const headers = ["ID","Student Name","Gender","Student Contact","Parent Contact","Email",
      "Standard","Batch","Branch","Address","Reference","Status","Feedback 1","Feedback 2","Notes",
      "Hostel Required","Taking Coaching","Date"]
    const rows = filtered.map(inq => [
      inq.id, inq.studentName, inq.sex, inq.studentContact, inq.parentContact,
      inq.email, inq.standard, inq.batch, inq.branch, inq.address,
      inq.reference, inq.status, inq.feedback1, inq.feedback2, inq.notes,
      inq.hostelRequired, inq.takingCoaching,
      inq.created_at ? new Date(inq.created_at).toLocaleDateString("en-CA") : "",
    ])
    const esc = (v: string | number) => `"${String(v).replace(/"/g, "\"\"")}"`
    const csv  = [headers, ...rows].map(r => r.map(esc).join(",")).join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a")
    a.href = url; a.download = `inquiry_students_${new Date().toISOString().slice(0,10)}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
  }

  const isEditMode = editingId !== null

  // ── Stat cards ──
  const statCards = [
    { label: "Total Inquiries", value: inquiries.length,                                    bg: "bg-[#2563EB]" },
    { label: "Confirmed",       value: inquiries.filter(i => i.status === "Confirmed").length, bg: "bg-[#16A34A]" },
    { label: "Pending",         value: inquiries.filter(i => i.status === "Pending").length,   bg: "bg-[#EA580C]" },
    { label: "Maybe",           value: inquiries.filter(i => i.status === "Maybe").length,     bg: "bg-[#7C3AED]" },
  ]

  // ═══════════════════════════════════════════
  return (
    <>
      <style>{DRAWER_STYLES}</style>

      <div className="space-y-4">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Inquiry Students</h1>
            <p className="text-gray-500 text-xs sm:text-sm mt-0.5">All student inquiries submitted via the public form</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={openAddDrawer}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs sm:text-sm font-semibold transition-colors shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Inquiry
            </button>
            <button onClick={fetchInquiries}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-xs sm:text-sm font-semibold transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs sm:text-sm font-semibold transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v1a3 3 0 003 3h10a3 3 0 003-3v-1" />
              </svg>
              <span className="hidden sm:inline">Export Excel</span>
            </button>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {statCards.map(card => (
            <div key={card.label} className={`${card.bg} rounded-xl sm:rounded-2xl px-4 sm:px-5 py-4 sm:py-5 flex flex-col gap-2`}>
              <p className="text-white/80 text-xs sm:text-sm font-medium">{card.label}</p>
              <p className="text-white text-2xl sm:text-3xl font-bold leading-none">{card.value}</p>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
          <div className="relative flex-1 min-w-0">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" placeholder="Search name, phone, email, branch..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 sm:py-2.5 rounded-lg border border-gray-200 bg-white text-gray-800 text-xs sm:text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-all" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { val: filterSex,    set: setFilterSex,    opts: ["Male","Female","Other"],            placeholder: "All Genders"  },
              { val: filterBatch,  set: setFilterBatch,  opts: ["State Board","CBSE","ICSE","IB"],   placeholder: "All Boards"  },
              { val: filterStatus, set: setFilterStatus, opts: ["Confirmed","Pending","Maybe"],      placeholder: "All Statuses" },
            ].map(({ val, set, opts, placeholder }) => (
              <select key={placeholder} value={val} onChange={e => set(e.target.value)}
                className="flex-1 min-w-[110px] px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 transition-all cursor-pointer">
                <option value="">{placeholder}</option>
                {opts.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ))}
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <svg className="w-8 h-8 animate-spin text-[#2563EB]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-gray-400 text-sm">Loading inquiries...</p>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            MOBILE  — Card list (< 768 px)
        ═══════════════════════════════════════════════ */}
        {!loading && isMobile && (
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <EmptyState />
            ) : filtered.map((inq, idx) => (
              <div key={inq.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

                {/* Card header */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#2563EB] flex items-center justify-center shrink-0">
                      <span className="text-white font-bold text-xs">{inq.studentName?.charAt(0)?.toUpperCase() || "?"}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-gray-900 font-semibold text-sm leading-tight truncate">{inq.studentName || "—"}</p>
                      <p className="text-gray-400 text-xs">{inq.sex || "—"} · #{idx + 1}</p>
                    </div>
                  </div>
                  <select value={inq.status} onChange={e => handleStatusChange(inq.id, e.target.value)}
                    className={`shrink-0 pl-2 pr-5 py-1 rounded-full border text-xs font-semibold cursor-pointer appearance-none focus:outline-none ${STATUS_STYLES[inq.status] || "bg-gray-50 border-gray-200 text-gray-600"}`}>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Pending">Pending</option>
                    <option value="Maybe">Maybe</option>
                  </select>
                </div>

                {/* Card body */}
                <div className="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2">
                  <MobileField label="Phone"    value={inq.studentContact} />
                  <MobileField label="Standard" value={inq.standard} />
                  <MobileField label="Board"    value={inq.batch} />
                  <MobileField label="Branch"   value={inq.branch} />
                  <MobileField label="Reference" value={inq.reference} />
                  <MobileField label="Date"     value={
                    inq.created_at
                      ? new Date(inq.created_at).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })
                      : "—"
                  } />
                  {inq.feedback1 && <MobileField label="Feedback 1" value={inq.feedback1} className="col-span-2" />}
                  {inq.notes     && <MobileField label="Notes"      value={inq.notes}     className="col-span-2" />}
                </div>

                {/* Card footer: View + Edit */}
                <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
                  <button onClick={() => setSelected(inq)}
                    className="flex-1 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors text-center flex items-center justify-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View
                  </button>
                  <button onClick={() => openEditDrawer(inq)}
                    className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors text-center flex items-center justify-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  <button onClick={() => handleDelete(inq.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
                </div>
              </div>
            ))}
            {filtered.length > 0 && (
              <p className="text-center text-gray-400 text-xs pb-2">
                Showing {filtered.length} of {inquiries.length} inquiries
              </p>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            DESKTOP — Full table (≥ 768 px)
        ═══════════════════════════════════════════════ */}
        {!loading && !isMobile && (
          <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-900">
                    {["Sr no.","Student","Contact","Standard","Board","Branch & Address",
                      "Reference","Status","Feedback 1","Feedback 2","Notes","Inquiry Date","Actions"
                    ].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-white font-semibold text-xs whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={13}><EmptyState /></td></tr>
                  ) : filtered.map((inq, idx) => (
                    <tr key={inq.id} className="hover:bg-gray-50/60 transition-colors">

                      <td className="px-4 py-3 text-gray-400 text-xs font-medium">{idx + 1}</td>

                      {/* Student */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#2563EB] flex items-center justify-center shrink-0">
                            <span className="text-white font-bold text-xs">{inq.studentName?.charAt(0)?.toUpperCase() || "?"}</span>
                          </div>
                          <div>
                            <p className="text-gray-900 font-semibold text-sm leading-tight whitespace-nowrap">{inq.studentName || "—"}</p>
                            <p className="text-gray-400 text-xs">{inq.sex || "—"}</p>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-3">
                        <p className="text-gray-700 text-xs font-medium whitespace-nowrap">{inq.studentContact || "—"}</p>
                        <p className="text-gray-400 text-xs truncate max-w-[140px]">{inq.email || "—"}</p>
                      </td>

                      {/* Standard */}
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold whitespace-nowrap">
                          {inq.standard || "—"}
                        </span>
                      </td>

                      {/* Board */}
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-md border text-xs font-semibold whitespace-nowrap ${
                          inq.batch === "CBSE" ? "bg-green-50 border-green-200 text-green-700" : "bg-gray-50 border-gray-200 text-gray-600"
                        }`}>
                          {inq.batch || "—"}
                        </span>
                      </td>

                      {/* Branch & Address */}
                      <td className="px-4 py-3 max-w-[150px]">
                        {inq.branch && (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold block w-fit mb-1">
                            {inq.branch}
                          </span>
                        )}
                        <p className="text-gray-500 text-xs truncate" title={inq.address}>{inq.address || "—"}</p>
                      </td>

                      {/* Reference */}
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-md border text-xs font-semibold whitespace-nowrap ${REF_BADGE[inq.reference] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
                          {inq.reference || "—"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[inq.status] || "bg-gray-300"}`} />
                          <select value={inq.status} onChange={e => handleStatusChange(inq.id, e.target.value)}
                            className={`pl-1 pr-6 py-1 rounded-md border text-xs font-semibold cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 transition-all ${STATUS_STYLES[inq.status] || "bg-gray-50 border-gray-200 text-gray-600"}`}>
                            <option value="Confirmed">Confirmed</option>
                            <option value="Pending">Pending</option>
                            <option value="Maybe">Maybe</option>
                          </select>
                        </div>
                      </td>

                      {/* Feedback 1 */}
                      <td className="px-4 py-3 max-w-[130px]">
                        <p className="text-gray-600 text-xs truncate" title={inq.feedback1}>{inq.feedback1 || "—"}</p>
                      </td>

                      {/* Feedback 2 */}
                      <td className="px-4 py-3 max-w-[130px]">
                        <p className="text-gray-600 text-xs truncate" title={inq.feedback2}>{inq.feedback2 || "—"}</p>
                      </td>

                      {/* Notes */}
                      <td className="px-4 py-3 max-w-[140px]">
                        <p className="text-gray-500 text-xs truncate" title={inq.notes}>{inq.notes || "—"}</p>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {inq.created_at
                          ? new Date(inq.created_at).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })
                          : "—"}
                      </td>

                      {/* Actions: View + Edit */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {/* View */}
                          <button onClick={() => setSelected(inq)} title="View details"
                            className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          {/* Edit */}
                          <button onClick={() => openEditDrawer(inq)} title="Edit inquiry"
                            className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 hover:text-amber-800 border border-amber-200 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          {/* Delete */}
                          <button onClick={() => handleDelete(inq.id)} title="Delete inquiry"
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700 border border-red-200 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-100 text-gray-400 text-xs">
                Showing {filtered.length} of {inquiries.length} inquiries
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════
          SLIDE-IN DRAWER  (Add & Edit — same component)
      ═══════════════════════════════════════════════ */}
      {drawerMounted && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm fade-in-bg" onClick={closeDrawer} />

          <div className={`fixed top-0 right-0 z-50 h-screen w-full max-w-[500px] bg-white shadow-2xl flex flex-col ${drawerOpen ? "drawer-in" : "drawer-out"}`}>

            {/* Header — amber in Edit mode, dark in Add */}
            <div className={`shrink-0 flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 ${isEditMode ? "bg-amber-600" : "bg-gray-900"}`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isEditMode ? "bg-white/20" : "bg-[#2563EB]"}`}>
                  {isEditMode
                    ? <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    : <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  }
                </div>
                <div>
                  <h3 className="text-white font-bold text-base sm:text-lg leading-tight">
                    {isEditMode ? "Edit Inquiry" : "Add New Inquiry"}
                  </h3>
                  <p className="text-white/60 text-xs">
                    {isEditMode ? `Editing ID #${editingId}` : "Fill in the student details below"}
                  </p>
                </div>
              </div>
              <button onClick={closeDrawer}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Progress bar */}
            <div className="shrink-0 h-1 bg-gray-100">
              <div className={`h-full transition-all duration-500 ${isEditMode ? "bg-amber-500" : "bg-[#2563EB]"}`}
                style={{ width: formLoading ? "75%" : formSuccess ? "100%" : "0%" }} />
            </div>

            {/* Scrollable form */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6">

              {formSuccess && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {formSuccess}
                </div>
              )}
              {formError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formError}
                </div>
              )}

              {/* Basic Details */}
              <FormSection title="Basic Details" color="blue">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField label="Student Name *" className="sm:col-span-2">
                    <input name="name" value={formData.name} onChange={handleFormChange} placeholder="Full name" className={inputCls} />
                  </FormField>
                  <FormField label="Date of Birth">
                    <input name="dob" type="date" value={formData.dob} onChange={handleFormChange} className={inputCls} />
                  </FormField>
                  <FormField label="Gender">
                    <select name="sex" value={formData.sex} onChange={handleFormChange} className={inputCls}>
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </FormField>
                  <FormField label="Student Contact *">
                    <input name="phone" value={formData.phone} onChange={handleFormChange} placeholder="10-digit mobile" className={inputCls} />
                  </FormField>
                  <FormField label="Parent Contact">
                    <input name="father_phone" value={formData.father_phone} onChange={handleFormChange} placeholder="Parent mobile" className={inputCls} />
                  </FormField>
                  <FormField label="Father's Name">
                    <input name="father_name" value={formData.father_name} onChange={handleFormChange} placeholder="Father's full name" className={inputCls} />
                  </FormField>
                  <FormField label="Email">
                    <input name="email" type="email" value={formData.email} onChange={handleFormChange} placeholder="student@email.com" className={inputCls} />
                  </FormField>
                  <FormField label="Branch">
                    <select name="branch" value={formData.branch} onChange={handleFormChange} className={inputCls}>
                      <option value="">Select Branch</option>
                      {["Akurdi", "Bijaliinagar", "Walhekarwadi"].map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Address" className="sm:col-span-2">
                    <textarea name="address" value={formData.address} onChange={handleFormChange}
                      placeholder="Full address" rows={2} className={`${inputCls} resize-none`} />
                  </FormField>
                </div>
              </FormSection>

              {/* Academic Details */}
              <FormSection title="Academic Details" color="green">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField label="Standard *">
                    <select name="standard" value={formData.standard} onChange={handleFormChange} className={inputCls}>
                      <option value="">Select</option>
                      {[
                        "1st Standard", "2nd Standard", "3rd Standard", "4th Standard", "5th Standard",
                        "6th Standard", "7th Standard", "8th Standard", "9th Standard", "10th Standard",
                        "11th Standard", "12th Standard", "Dropper"
                      ].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Board">
                    <select name="board" value={formData.board} onChange={handleFormChange} className={inputCls}>
                      <option value="">Select</option>
                      <option value="State Board">State Board</option>
                      <option value="CBSE">CBSE</option>
                      <option value="ICSE">ICSE</option>
                      <option value="IB">IB</option>
                    </select>
                  </FormField>
                  <FormField label="Last Exam Marks">
                    <input name="last_exam_marks" value={formData.last_exam_marks} onChange={handleFormChange} placeholder="e.g. 85%" className={inputCls} />
                  </FormField>
                  <FormField label="College Timing">
                    <input name="college_timing" value={formData.college_timing} onChange={handleFormChange} placeholder="e.g. 7AM – 12PM" className={inputCls} />
                  </FormField>
                  <FormField label="College Name" className="sm:col-span-2">
                    <input name="college_name" value={formData.college_name} onChange={handleFormChange} placeholder="Current college / school" className={inputCls} />
                  </FormField>
                  <FormField label="Future Plans" className="sm:col-span-2">
                    <input name="future_plans" value={formData.future_plans} onChange={handleFormChange} placeholder="e.g. JEE, NEET, MHT-CET" className={inputCls} />
                  </FormField>
                </div>
              </FormSection>

              {/* Family & Other Info */}
              <FormSection title="Family & Other Info" color="orange">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField label="Father's Occupation">
                    <input name="father_occupation" value={formData.father_occupation} onChange={handleFormChange} placeholder="e.g. Business" className={inputCls} />
                  </FormField>
                  <FormField label="Mother's Occupation">
                    <input name="mother_occupation" value={formData.mother_occupation} onChange={handleFormChange} placeholder="e.g. Homemaker" className={inputCls} />
                  </FormField>
                  <FormField label="Sibling Name">
                    <input name="sibling_name" value={formData.sibling_name} onChange={handleFormChange} placeholder="If any" className={inputCls} />
                  </FormField>
                  <FormField label="Reference">
                    <select name="reference" value={formData.reference} onChange={handleFormChange} className={inputCls}>
                      <option value="">Select</option>
                      {["Social Media (Instagram/Facebook)","Google","Hoarding","Website","Justdial","Friends","Pamphlets","Other"].map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Taking Coaching">
                    <select name="taking_coaching" value={formData.taking_coaching} onChange={handleFormChange} className={inputCls}>
                      <option value="">Select</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </FormField>
                  <FormField label="Hostel Required">
                    <select name="hostel_required" value={formData.hostel_required} onChange={handleFormChange} className={inputCls}>
                      <option value="">Select</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </FormField>
                </div>
              </FormSection>

              {/* Follow-up & Feedback */}
              <FormSection title="Follow-up & Feedback" color="purple">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Visual status picker */}
                  <FormField label="Status" className="sm:col-span-2">
                    <div className="flex gap-2">
                      {(["Confirmed","Pending","Maybe"] as const).map(s => (
                        <button key={s} type="button"
                          onClick={() => setFormData(prev => ({ ...prev, status: s }))}
                          className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                            formData.status === s
                              ? STATUS_STYLES[s] + " ring-2 ring-offset-1 " + (s==="Confirmed"?"ring-green-400":s==="Pending"?"ring-yellow-400":"ring-blue-400")
                              : "bg-white border-gray-200 text-gray-400 hover:border-gray-300"
                          }`}>
                          <span className={`w-2 h-2 rounded-full ${formData.status === s ? STATUS_DOT[s] : "bg-gray-300"}`} />
                          {s}
                        </button>
                      ))}
                    </div>
                  </FormField>
                  <FormField label="Feedback 1">
                    <input name="feedback1" value={formData.feedback1} onChange={handleFormChange} placeholder="First call feedback" className={inputCls} />
                  </FormField>
                  <FormField label="Feedback 2">
                    <input name="feedback2" value={formData.feedback2} onChange={handleFormChange} placeholder="Second call feedback" className={inputCls} />
                  </FormField>
                  <FormField label="Notes" className="sm:col-span-2">
                    <textarea name="notes" value={formData.notes} onChange={handleFormChange}
                      placeholder="Additional notes about this inquiry..." rows={3}
                      className={`${inputCls} resize-none`} />
                  </FormField>
                </div>
              </FormSection>
            </div>

            {/* Footer */}
            <div className="shrink-0 px-4 sm:px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
              <p className="text-gray-400 text-xs hidden sm:block">
                <span className="text-red-400 font-bold">*</span> Required fields
              </p>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button onClick={closeDrawer} disabled={formLoading}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50">
                  Cancel
                </button>
                <button onClick={handleSubmit} disabled={formLoading}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-white text-sm font-semibold transition-colors disabled:opacity-60 ${
                    isEditMode ? "bg-amber-500 hover:bg-amber-600" : "bg-[#2563EB] hover:bg-[#1D4ED8]"
                  }`}>
                  {formLoading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      {isEditMode ? "Updating..." : "Saving..."}
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d={isEditMode
                            ? "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            : "M5 13l4 4L19 7"}
                        />
                      </svg>
                      {isEditMode ? "Update Inquiry" : "Save Inquiry"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════
          VIEW MODAL  — slides up from bottom on mobile
      ═══════════════════════════════════════════════ */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setSelected(null)}>
          <div className="w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl sm:border sm:border-gray-200"
            onClick={e => e.stopPropagation()}>

            <div className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 bg-gray-900 rounded-t-2xl">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#2563EB] flex items-center justify-center shrink-0">
                  <span className="text-white font-bold text-sm">{selected.studentName?.charAt(0)?.toUpperCase()}</span>
                </div>
                <div className="min-w-0">
                  <h3 className="text-white font-bold text-base sm:text-lg leading-tight truncate">{selected.studentName}</h3>
                  <p className="text-gray-400 text-xs">{selected.standard} · {selected.batch}{selected.branch ? ` · ${selected.branch}` : ""}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className={`hidden sm:flex px-3 py-1 rounded-full border text-xs font-bold items-center gap-1.5 ${STATUS_STYLES[selected.status] || "bg-gray-50 border-gray-200 text-gray-600"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[selected.status] || "bg-gray-400"}`} />
                  {selected.status}
                </span>
                {/* Edit from modal */}
                <button onClick={() => openEditDrawer(selected)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
                <button onClick={() => setSelected(null)}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-300 hover:text-white transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <button onClick={() => handleDelete(selected.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
              <InfoGroup title="Basic Details" color="blue">
                <InfoRow label="Student Name"    value={selected.studentName} />
                <InfoRow label="Date of Birth"   value={selected.dob || "—"} />
                <InfoRow label="Gender"          value={selected.sex || "—"} />
                <InfoRow label="Student Contact" value={selected.studentContact} />
                <InfoRow label="Parent Contact"  value={selected.parentContact} />
                <InfoRow label="Email"           value={selected.email || "—"} />
                <InfoRow label="Branch"          value={selected.branch || "—"} />
                <InfoRow label="Address"         value={selected.address || "—"} />
              </InfoGroup>
              <InfoGroup title="Academic Details" color="green">
                <InfoRow label="Standard"        value={selected.standard} />
                <InfoRow label="Batch"           value={selected.batch} />
                <InfoRow label="Last Exam Marks" value={selected.lastExamMarks || "—"} />
                <InfoRow label="College Name"    value={selected.collegeName || "—"} />
                <InfoRow label="College Timing"  value={selected.collegeTiming || "—"} />
                <InfoRow label="Future Plans"    value={selected.futurePlans || "—"} />
              </InfoGroup>
              <InfoGroup title="Family & Contact" color="orange">
                <InfoRow label="Father's Occupation" value={selected.fatherOccupation || "—"} />
                <InfoRow label="Mother's Occupation" value={selected.motherOccupation || "—"} />
                <InfoRow label="Sibling Name"        value={selected.siblingName || "—"} />
              </InfoGroup>
              <InfoGroup title="Follow-up & Feedback" color="purple">
                <InfoRow label="Status"     value={selected.status || "—"} />
                <InfoRow label="Feedback 1" value={selected.feedback1 || "—"} />
                <InfoRow label="Feedback 2" value={selected.feedback2 || "—"} />
                <InfoRow label="Notes"      value={selected.notes || "—"} />
              </InfoGroup>
              <InfoGroup title="Other Info" color="dark">
                <InfoRow label="Reference"       value={selected.reference || "—"} />
                <InfoRow label="Taking Coaching" value={selected.takingCoaching || "—"} />
                <InfoRow label="Hostel Required" value={selected.hostelRequired || "—"} />
                <InfoRow label="Inquiry Date"    value={
                  selected.created_at
                    ? new Date(selected.created_at).toLocaleString("en-IN", { dateStyle:"medium", timeStyle:"short" })
                    : "—"
                } />
              </InfoGroup>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────
const inputCls =
  "w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-800 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-all"

function EmptyState() {
  return (
    <div className="text-center py-16 text-gray-400">
      <svg className="w-10 h-10 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      No inquiries found
    </div>
  )
}

function MobileField({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <p className="text-gray-400 text-[10px] uppercase tracking-wide font-medium mb-0.5">{label}</p>
      <p className="text-gray-800 text-xs font-semibold truncate">{value || "—"}</p>
    </div>
  )
}

function FormSection({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  const styles: Record<string, string> = {
    blue:   "bg-[#2563EB] text-white",
    green:  "bg-[#16A34A] text-white",
    orange: "bg-[#EA580C] text-white",
    purple: "bg-[#7C3AED] text-white",
  }
  return (
    <div className="space-y-3">
      <div className={`inline-flex px-3 py-1 rounded-lg text-xs font-bold tracking-wider uppercase ${styles[color]}`}>{title}</div>
      {children}
    </div>
  )
}

function FormField({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-gray-500 text-xs font-medium">{label}</label>
      {children}
    </div>
  )
}

function InfoGroup({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  const styles: Record<string, string> = {
    blue:   "bg-[#2563EB] text-white",
    green:  "bg-[#16A34A] text-white",
    orange: "bg-[#EA580C] text-white",
    purple: "bg-[#7C3AED] text-white",
    dark:   "bg-gray-900 text-white",
  }
  return (
    <div className="space-y-2">
      <div className={`inline-flex px-3 py-1 rounded-lg text-xs font-bold tracking-wider uppercase ${styles[color]}`}>{title}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{children}</div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100">
      <p className="text-gray-400 text-xs mb-0.5">{label}</p>
      <p className="text-gray-900 text-sm font-semibold break-words">{value}</p>
    </div>
  )
}