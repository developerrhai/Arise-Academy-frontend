"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Receipt, Plus, Eye, Printer, Trash2, CheckCircle, Clock, AlertCircle, Loader2, Search, X, Edit2, FileSpreadsheet, MessageCircle } from "lucide-react"
import { invoicesApi, studentsApi } from "@/lib/api"

interface Invoice {
  id: number
  student_name: string
  student_phone?: string
  amount: number
  paid_amount: number
  due_date?: string
  course?: string
  student_id?: string
  standard?: string
  install_date?: string
  paid_date?: string
  description?: string
  transaction_type?: string
}

interface Student {
  id: number
  name: string
  phone: string
  standard: string
  course: string
  location: string
  fee: number
  paid_fee: number
  father_name: string
}

interface Summary { total_invoiced: number; total_paid: number; total_pending: number }

type InvoiceStatus = "Paid" | "Partial" | "Pending" | "Overdue"

const getStatus = (inv: Invoice): InvoiceStatus => {
  const amount = Number(inv.amount)
  const paid   = Number(inv.paid_amount)
  if (paid >= amount) return "Paid"
  if (paid > 0)       return "Partial"
  if (inv.due_date && new Date(inv.due_date) < new Date()) return "Overdue"
  return "Pending"
}

const statusColor = (s: string) => ({
  Paid:    "bg-emerald-100 text-emerald-700",
  Partial: "bg-yellow-100 text-yellow-700",
  Pending: "bg-blue-100 text-blue-700",
  Overdue: "bg-red-100 text-red-700",
}[s] ?? "bg-gray-100 text-gray-700")

const statusIcon = (s: string) => ({
  Paid:    <CheckCircle className="h-4 w-4" />,
  Partial: <Clock className="h-4 w-4" />,
  Pending: <Clock className="h-4 w-4" />,
  Overdue: <AlertCircle className="h-4 w-4" />,
}[s] ?? null)

const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString() : "—"

export function InvoicesContent() {
  const [invoices,      setInvoices]      = useState<Invoice[]>([])
  const [summary,       setSummary]       = useState<Summary>({ total_invoiced: 0, total_paid: 0, total_pending: 0 })
  const [loading,       setLoading]       = useState(true)
  const [saving,        setSaving]        = useState(false)
  const [filterStatus,  setFilterStatus]  = useState("all")
  const [studentFilter, setStudentFilter] = useState("")
  const [modalOpen,     setModalOpen]     = useState(false)
  const [viewOpen,      setViewOpen]      = useState(false)
  const [selected,      setSelected]      = useState<Invoice | null>(null)
  const [editing,       setEditing]       = useState<Invoice | null>(null)

  const [students,        setStudents]        = useState<Student[]>([])
  const [studentSearch,   setStudentSearch]   = useState("")
  const [showDropdown,    setShowDropdown]    = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [studentsLoading, setStudentsLoading] = useState(false)

  const [form, setForm] = useState({
    student_name:     "",
    amount:           "",
    paid_amount:      "",
    due_date:         "",
    install_date:     "",
    paid_date:        "",
    transaction_type: "Cash",
    description:      "",
    student_id:       "",
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [invRes, sumRes]: any[] = await Promise.all([
        invoicesApi.getAll({ status: filterStatus !== "all" ? filterStatus : undefined }),
        invoicesApi.summary(),
      ])
      setInvoices(invRes.data)
      setSummary(sumRes.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [filterStatus])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!studentSearch.trim() || studentSearch.length < 1) {
      setStudents([])
      setShowDropdown(false)
      return
    }
    const timer = setTimeout(async () => {
      setStudentsLoading(true)
      try {
        const res: any = await studentsApi.getAll({ search: studentSearch })
        setStudents(res.data || [])
        setShowDropdown(true)
      } catch {
        setStudents([])
      } finally {
        setStudentsLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [studentSearch])

  const pickStudent = (s: Student) => {
    setSelectedStudent(s)
    setStudentSearch(s.name)
    setShowDropdown(false)
    const remaining = Number(s.fee) - Number(s.paid_fee)
    setForm(prev => ({
      ...prev,
      student_name: s.name,
      student_id:   String(s.id),
      amount:       remaining > 0 ? String(remaining) : String(s.fee),
      paid_amount:  String(s.paid_fee ?? 0),
      description:  `Tuition Fee – ${s.course || s.standard + "th Std"}`,
    }))
  }

  const clearStudent = () => {
    setSelectedStudent(null)
    setStudentSearch("")
    setStudents([])
    setShowDropdown(false)
    setForm(prev => ({
      ...prev,
      student_name: "", student_id: "", amount: "",
      paid_amount: "", description: "",
    }))
  }

  const openModal = () => {
    setEditing(null)
    clearStudent()
    setForm({
      student_name: "", amount: "", paid_amount: "",
      due_date: "", install_date: "", paid_date: "",
      transaction_type: "Cash", description: "", student_id: "",
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
  if (!form.student_name || !form.amount || !form.due_date) {
    alert("Fill required fields"); return
  }
  setSaving(true)
  try {
    const payload = {
      student_name:     form.student_name,
      student_id:       form.student_id || undefined,
      amount:           parseFloat(form.amount),
      paid_amount:      parseFloat(form.paid_amount) || 0,
      due_date:         form.due_date,
      install_date:     form.install_date || undefined,
      paid_date:        form.paid_date || undefined,
      transaction_type: form.transaction_type,
      description:      form.description,
    }

    if (editing) {
      await invoicesApi.update(editing.id, payload)
    } else {
      await invoicesApi.create(payload)
    }

    // ── Sync paid_fee back to the student record ──────────────
     if (form.student_id && payload.paid_amount > 0) {
      try {
        // Sum ALL invoices for this student so paid_fee is always the total
        const allInvoices: any = await invoicesApi.getAll({})
        const totalPaid = (allInvoices.data || [])
          .filter((inv: any) => String(inv.student_id) === String(form.student_id))
          .reduce((sum: number, inv: any) => sum + Number(inv.paid_amount || 0), 0)

        const res: any = await studentsApi.getAll({ search: form.student_name })
        const match = (res.data || []).find(
          (s: any) => String(s.id) === String(form.student_id)
        )

        if (match) {
          await studentsApi.update(match.id, {
            ...match,
            paid_fee: totalPaid,
            subjects: Array.isArray(match.subjects)
              ? match.subjects.join(",")
              : match.subjects || "",
          })
        }
      } catch (syncErr) {
        console.warn("Student paid_fee sync failed:", syncErr)
        // Non-fatal — invoice was saved; just log the sync failure
      }
    }
    // ─────────────────────────────────────────────────────────

    setModalOpen(false)
    setEditing(null)
    load()
  } catch (err: any) { alert(err.message) }
  finally { setSaving(false) }
}

  const openEdit = (inv: Invoice) => {
    setEditing(inv)
    setSelectedStudent({
      id: Number(inv.student_id || 0),
      name: inv.student_name || "",
      phone: "",
      standard: inv.standard || "",
      course: inv.course || "",
      location: "",
      fee: Number(inv.amount || 0),
      paid_fee: Number(inv.paid_amount || 0),
      father_name: "",
    })
    setStudentSearch(inv.student_name || "")
    setShowDropdown(false)
    setForm({
      student_name:     inv.student_name || "",
      student_id:       inv.student_id || "",
      amount:           String(inv.amount ?? ""),
      paid_amount:      String(inv.paid_amount ?? 0),
      due_date:         inv.due_date     ? new Date(inv.due_date).toISOString().split("T")[0]     : "",
      install_date:     inv.install_date ? new Date(inv.install_date).toISOString().split("T")[0] : "",
      paid_date:        inv.paid_date    ? new Date(inv.paid_date).toISOString().split("T")[0]    : "",
      transaction_type: inv.transaction_type || "Cash",
      description:      inv.description || "",
    })
    setModalOpen(true)
  }

  const handleExportExcel = () => {
    if (!invoices.length) { alert("No invoices to export"); return }
    const headers = [
      "Invoice ID", "Student Name", "Student ID", "Amount", "Paid Amount",
      "Balance", "Paid Date", "Install Date", "Due Date", "Transaction Type", "Status", "Description",
    ]
    const rows = invoices.map((inv) => {
      const amount  = Number(inv.amount || 0)
      const paid    = Number(inv.paid_amount || 0)
      const balance = amount - paid
      return [
        `INV${String(inv.id).padStart(3, "0")}`,
        inv.student_name || "",
        inv.student_id || "",
        amount, paid, balance,
        inv.paid_date    ? new Date(inv.paid_date).toLocaleDateString("en-CA")    : "",
        inv.install_date ? new Date(inv.install_date).toLocaleDateString("en-CA") : "",
        inv.due_date     ? new Date(inv.due_date).toLocaleDateString("en-CA")     : "",
        inv.transaction_type || "",
        getStatus(inv),
        inv.description || "",
      ]
    })
    const esc = (value: string | number) => `"${String(value).replace(/"/g, "\"\"")}"`
    const csv  = [headers, ...rows].map((row) => row.map(esc).join(",")).join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a")
    a.href = url
    a.download = `invoices_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this invoice?")) return
    try { await invoicesApi.remove(id); load() } catch (err: any) { alert(err.message) }
  }

const handlePrint = async (inv: Invoice) => {
    let studentPhone = inv.student_phone || ""
    let standard     = inv.standard      || ""

    if ((!studentPhone || !standard) && inv.student_id) {
      try {
        const res: any = await studentsApi.getAll({ search: inv.student_name })
        const match = (res.data || []).find((s: Student) => String(s.id) === String(inv.student_id))
        if (match) {
          if (!studentPhone) studentPhone = match.phone    || ""
          if (!standard)     standard     = match.standard || ""
        }
      } catch { /* fallback */ }
    }

    const paidDate = inv.paid_date || inv.install_date || ""
    const today = new Date().toLocaleDateString("en-IN", {
      day: "2-digit", month: "2-digit", year: "numeric"
    })

    const w = window.open("", "_blank")
    if (!w) return
    const balance = Number(inv.amount) - Number(inv.paid_amount)

    w.document.write(`
    <html>
    <head>
      <title>Invoice #${inv.id}</title>
      <style>
        @page { size: A4; margin: 0; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { width: 210mm; height: 297mm; }
        body {
          font-family: Arial, Helvetica, sans-serif;
          color: #000;
          font-size: 11px;
          line-height: 1.4;
        }

        .page {
          width: 210mm;
          height: 297mm;
          padding: 8mm 12mm;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        /* ── Header ── */
        .header {
          border-bottom: 3px solid #0b7db7;
          padding-bottom: 5px;
          flex-shrink: 0;
        }
        .logo { width: 100%; height: 270px; object-fit: cover; display: block; }

        /* ── Title ── */
        .title {
          text-align: center;
          color: #0b7db7;
          font-size: 22px;
          font-weight: bold;
          padding: 8px 0 6px;
          flex-shrink: 0;
        }

        /* ── Bill To + Invoice Details ── */
        .top-section {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          border-top: 1px solid #e0e0e0;
          border-bottom: 1px solid #e0e0e0;
          flex-shrink: 0;
        }
        .bill-to h3, .invoice-details h3 {
          font-size: 12px;
          color: #0b7db7;
          margin-bottom: 5px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .bill-to p, .invoice-details p { font-size: 11px; margin: 3px 0; }
        .invoice-details { text-align: right; }

        /* ── Items Table ── */
        .table-wrap { flex-shrink: 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th {
          background: #0b7db7;
          color: #fff;
          padding: 7px 8px;
          font-size: 11px;
          text-align: left;
        }
        td { padding: 7px 8px; border-bottom: 1px solid #e8e8e8; font-size: 11px; }
        td:last-child, th:last-child { text-align: right; }
        tr:nth-child(even) td { background: #f7fbff; }

        /* ── Summary ── */
        .summary-wrap {
          display: flex;
          justify-content: flex-end;
          margin-top: 8px;
          flex-shrink: 0;
        }
        .summary-table { width: 42%; border-collapse: collapse; }
        .summary-table td { padding: 5px 10px; font-size: 11px; border: none; }
        .summary-table td:last-child { text-align: right; }
        .total-row td { background: #0b7db7; color: #fff; font-weight: bold; font-size: 12px; }
        .summary-table tr:not(.total-row) td { background: #f0f7ff; }

        /* ── Payment + Signature (flex-grow fills remaining space) ── */
        .payment-signature {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-grow: 1;
          padding: 10px 0 4px;
          border-top: 1px solid #e0e0e0;
          margin-top: 8px;
          gap: 8px;
        }

        .payment { display: flex; flex-direction: column; align-items: center; width: 28%; }
        .payment p { font-size: 10px; margin-bottom: 5px; font-weight: bold; text-align: center; }
        .payment img { width: 110px; height: 110px; }

        .or-divider {
          font-size: 14px;
          font-weight: bold;
          color: #888;
          text-align: center;
          width: 8%;
        }

        .bank-details { width: 30%; }
        .bank-details p { margin: 4px 0; font-size: 10.5px; }
        .bank-details .bank-title { font-weight: bold; font-size: 11px; color: #0b7db7; margin-bottom: 6px; }

        .signature {
          width: 28%;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
        }
        .signature p { font-size: 10px; margin-bottom: 4px; }
        .signature img { width: 110px; }
        .auth { font-weight: bold; font-size: 11px; margin-top: 4px; }
        .sig-line { width: 100%; border-top: 1px solid #000; margin-top: 6px; padding-top: 4px; }

        /* ── Terms ── */
        .terms {
          border-top: 2px solid #0b7db7;
          padding-top: 7px;
          flex-shrink: 0;
        }
        .terms h3 { font-size: 11px; color: #0b7db7; margin-bottom: 5px; text-transform: uppercase; }
        .terms p { font-size: 10px; margin: 2px 0; color: #333; }
        .terms .thankyou { margin-top: 5px; font-weight: bold; font-size: 10.5px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="page">

        <!-- 1. Logo -->
        <div class="header">
          <img class="logo" src="/logo.jpeg" />
        </div>

        <!-- 2. Title --> 
        <div class="title">Fees Receipt</div>

        <!-- 3. Bill To + Invoice Details -->
        <div class="top-section">
          <div class="bill-to">
            <h3>Bill To</h3>
            <p style="font-size:11px; color:#000; font-weight: 500;">Address : 6th floor, Aishwarya Deer stone, Akurdi - 411044</p>
            <p style="font-size:11px; color:#000; font-weight: 500;">Institute Contact : 9923349044</p>
            <p style="font-size:11px; color:#000;">Branches : Akurdi | Bijaliinagar | Walhekarwadi</p>
            <p><b>${inv.student_name}</b></p>
            <p>Contact No. &nbsp;: ${studentPhone || "-"}</p>
            <p>Student ID &nbsp;&nbsp;: ${inv.student_id || "-"}</p>
            <p>Standard &nbsp;&nbsp;&nbsp;: ${standard || "-"}</p>
          </div>
          <div class="invoice-details">
            <h3>Invoice Details</h3>
            <p>Invoice No. : <b>INV${String(inv.id).padStart(4, "0")}</b></p>
            <p>Date &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: <b>${today}</b></p>
          </div>
        </div>

        <!-- 4. Items Table -->
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Course / Description</th>
                <th>Due Date</th>
                <th>Paid Date</th>
                <th>Transaction</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td>${inv.description || inv.course || "Course Fees"}</td>
                <td>${fmtDate(inv.due_date)}</td>
                <td>${fmtDate(paidDate)}</td>
                <td>${inv.transaction_type || "Online"}</td>
                <td>₹ ${Number(inv.paid_amount).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 5. Summary -->
        <div class="summary-wrap">
          <table class="summary-table">
            <tr class="total-row"><td>Total Amount</td><td>₹ ${Number(inv.amount).toLocaleString()}</td></tr>
            <tr><td>Amount Received</td><td>₹ ${Number(inv.paid_amount).toLocaleString()}</td></tr>
            <tr><td>Balance Due</td><td>₹ ${balance.toLocaleString()}</td></tr>
          </table>
        </div>

        <!-- 6. QR | OR | Bank | Signature -->
        <div class="payment-signature">
          <div class="payment">
            <p>Scan &amp; Pay via UPI</p>
            <img style="width: 180px;height:180px;" src="/qr.jpeg" />
          </div>

          <div class="or-divider">—<br/>OR<br/>—</div>

          <!-- ✅ UPDATED: Bank details for ARISE ACADEMY PRIVATE LIMITED -->
          <div class="bank-details">
            <p class="bank-title">Bank Transfer Details</p>
            <p>Bank Name &nbsp;&nbsp;&nbsp;&nbsp;: AU SMALL FINANCE BANK</p>
            <p>Account Name &nbsp;: ARISE ACADEMY PRIVATE LIMITED</p>
            <p>Account No. &nbsp;&nbsp;: 2602421712535347</p>
            <p>Account Type &nbsp;: CURRENT</p>
            <p>RTGS/NEFT IFSC : AUBL0004217</p>
          </div>

          <div class="signature">
            <p>For : ARISE ACADEMY PRIVATE LIMITED</p>
            <div class="sig-line">
              <div class="auth">Authorized Signatory</div>
            </div>
          </div>
        </div>

        <!-- 7. Terms -->
        <div class="terms">
          <h3>Terms &amp; Conditions</h3>
          <p>1. ONCE FEES PAID, CANNOT BE REFUNDED, TRANSFERRED OR ADJUSTED UNDER ANY CIRCUMSTANCES.</p>
          <p>2. FEES PAID MUST BE ON THE DUE DATE TO AVOID ADMISSION CANCELLATION.</p>
          <p class="thankyou">Thank You for choosing Arise Academy Private Limited !</p>
        </div>

      </div>
    </body>
    </html>
    `)
    w.document.close()
    w.print()
  }

  //  <img src="${window.location.origin}/sign.png" />
  // <p style="margin-top:6px; font-size:10px; color:#555;">Address : CTS NO. 731, GAWADE COMPLEX</p>

  const handleWhatsAppShare = (inv: Invoice) => {
    const invoiceNo = `INV${String(inv.id).padStart(3, "0")}`
    const amount    = Number(inv.amount || 0)
    const paid      = Number(inv.paid_amount || 0)
    const balance   = amount - paid
    const message   = [
      "Hello,", "",
      `Invoice: ${invoiceNo}`,
      `Student: ${inv.student_name || "-"}`,
      `Course: ${inv.course || "-"}`,
      `Due Date: ${fmtDate(inv.due_date)}`,
      `Total Amount: Rs ${amount.toLocaleString()}`,
      `Paid Amount: Rs ${paid.toLocaleString()}`,
      `Balance: Rs ${balance.toLocaleString()}`,
      "", "Please find your invoice details above.",
    ].join("\n")
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(url, "_blank", "noopener,noreferrer")
  }

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  const filteredInvoices = invoices.filter((inv) =>
    inv.student_name?.toLowerCase().includes(studentFilter.trim().toLowerCase())
  )

  return (
    <div className="space-y-6 pt-12 lg:pt-0">

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Invoiced",  value: summary.total_invoiced, cls: "from-blue-500 to-blue-600" },
          { label: "Total Collected", value: summary.total_paid,     cls: "from-emerald-500 to-emerald-600" },
          { label: "Pending Amount",  value: summary.total_pending,  cls: "from-amber-500 to-amber-600" },
        ].map(({ label, value, cls }) => (
          <Card key={label} className={`bg-gradient-to-br ${cls} text-white border-0`}>
            <CardContent className="p-4">
              <p className="text-sm opacity-90">{label}</p>
              <p className="text-2xl font-bold">₹{Number(value || 0).toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
            <Receipt className="h-6 w-6" /> Invoices
          </CardTitle>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative w-full sm:w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={studentFilter}
                onChange={(e) => setStudentFilter(e.target.value)}
                placeholder="Search student name..."
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                {["all", "Paid", "Partial", "Pending", "Overdue"].map(s => (
                  <SelectItem key={s} value={s}>{s === "all" ? "All Status" : s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleExportExcel} variant="outline">
              <FileSpreadsheet className="h-4 w-4 mr-2" /> Export Excel
            </Button>
            <Button onClick={openModal} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-2" /> New Invoice
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-900">
                    <TableHead className="text-white font-semibold">ID</TableHead>
                    <TableHead className="text-white font-semibold">Student</TableHead>
                    <TableHead className="text-white font-semibold hidden sm:table-cell">Amount</TableHead>
                    <TableHead className="text-white font-semibold hidden md:table-cell">Paid</TableHead>
                    <TableHead className="text-white font-semibold hidden lg:table-cell">Paid Date</TableHead>
                    <TableHead className="text-white font-semibold hidden lg:table-cell">Due Date</TableHead>
                    <TableHead className="text-white font-semibold">Status</TableHead>
                    <TableHead className="text-white font-semibold text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No invoices found
                      </TableCell>
                    </TableRow>
                  ) : filteredInvoices.map(inv => {
                    const status  = getStatus(inv)
                    const paidDate = inv.paid_date || inv.install_date || ""
                    return (
                      <TableRow key={inv.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">INV{String(inv.id).padStart(3, "0")}</TableCell>
                        <TableCell>{inv.student_name}</TableCell>
                        <TableCell className="hidden sm:table-cell">₹{Number(inv.amount).toLocaleString()}</TableCell>
                        <TableCell className="hidden md:table-cell">₹{Number(inv.paid_amount).toLocaleString()}</TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                          {fmtDate(paidDate)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">{fmtDate(inv.due_date)}</TableCell>
                        <TableCell>
                          <Badge className={`${statusColor(status)} flex items-center gap-1 w-fit`}>
                            {statusIcon(status)}{status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0"
                              onClick={() => { setSelected(inv); setViewOpen(true) }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0"
                              onClick={() => openEdit(inv)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0"
                              onClick={() => handlePrint(inv)}>
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:border-green-300"
                              onClick={() => handleWhatsAppShare(inv)}>
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="destructive" className="h-8 w-8 p-0"
                              onClick={() => handleDelete(inv.id)}>
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

      {/* ── Create / Edit Invoice Modal ──────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Invoice" : "Create New Invoice"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">

            {/* Student Search */}
            <div className="space-y-2">
              <Label>Student <span className="text-destructive">*</span></Label>
              {selectedStudent ? (
                <div className="flex items-start justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-sm text-emerald-800">{selectedStudent.name}</p>
                    <p className="text-xs text-emerald-600">
                      {selectedStudent.standard && `Std ${selectedStudent.standard}`}
                      {selectedStudent.course && ` · ${selectedStudent.course}`}
                      {selectedStudent.location && ` · ${selectedStudent.location}`}
                    </p>
                    <p className="text-xs text-emerald-600">
                      {selectedStudent.phone}
                      {selectedStudent.fee > 0 && (
                        <span className="ml-2">
                          · Fee: ₹{Number(selectedStudent.fee).toLocaleString()}
                          · Paid: ₹{Number(selectedStudent.paid_fee).toLocaleString()}
                          · <span className="font-medium">
                            Balance: ₹{(Number(selectedStudent.fee) - Number(selectedStudent.paid_fee)).toLocaleString()}
                          </span>
                        </span>
                      )}
                    </p>
                  </div>
                  <button onClick={clearStudent} className="text-emerald-500 hover:text-red-500 transition-colors ml-2 mt-0.5 shrink-0">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search student by name or phone..."
                      value={studentSearch}
                      onChange={e => setStudentSearch(e.target.value)}
                      onFocus={() => { if (students.length > 0) setShowDropdown(true) }}
                      className="pl-9 pr-9"
                    />
                    {studentsLoading && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    {studentSearch && !studentsLoading && (
                      <button onClick={clearStudent} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {showDropdown && students.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                      {students.map(s => (
                        <button key={s.id} onClick={() => pickStudent(s)}
                          className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted text-left transition-colors border-b border-border/50 last:border-0">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0 mt-0.5">
                            {s.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-foreground truncate">{s.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {[s.standard && `Std ${s.standard}`, s.course, s.phone].filter(Boolean).join(" · ")}
                            </p>
                            {s.fee > 0 && (
                              <p className="text-xs text-amber-600 font-medium mt-0.5">
                                Balance: ₹{(Number(s.fee) - Number(s.paid_fee)).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {showDropdown && students.length === 0 && studentSearch.length > 0 && !studentsLoading && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg px-4 py-3 text-sm text-muted-foreground">
                      No students found for "{studentSearch}"
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Amount fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount (₹) <span className="text-destructive">*</span></Label>
                <Input type="number" value={form.amount} onChange={e => f("amount", e.target.value)} placeholder="Total fee" />
              </div>
              <div className="space-y-2">
                <Label>Paid (₹)</Label>
                <Input type="number" value={form.paid_amount} onChange={e => f("paid_amount", e.target.value)} placeholder="Amount paid" />
              </div>
            </div>

            {/* Paid Date + Transaction Type */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Paid Date</Label>
                <Input type="date" value={form.paid_date} onChange={e => f("paid_date", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Transaction Type <span className="text-destructive">*</span></Label>
                <Select value={form.transaction_type} onValueChange={v => f("transaction_type", v)}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">💵 Cash</SelectItem>
                    <SelectItem value="Online">🌐 Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label>Due Date <span className="text-destructive">*</span></Label>
              <Input type="date" value={form.due_date} onChange={e => f("due_date", e.target.value)} />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={e => f("description", e.target.value)} placeholder="e.g. Tuition Fee – January" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? "Update Invoice" : "Create Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View Modal ───────────────────────────────────────── */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Invoice Details</DialogTitle></DialogHeader>
          {selected && (() => {
            const status   = getStatus(selected)
            const paidDate = selected.paid_date || selected.install_date || ""
            return (
              <div className="space-y-3">
                <div className="text-center pb-4 border-b">
                  <h3 className="text-lg font-bold text-blue-600">Arise Academy Private Limited</h3>
                  <p className="text-muted-foreground">Invoice #INV{String(selected.id).padStart(3, "0")}</p>
                </div>
                {([
                  ["Student",          selected.student_name],
                  ["Description",      selected.description],
                  ["Transaction Type", selected.transaction_type],
                  ["Paid Date",        fmtDate(paidDate)],
                  ["Due Date",         fmtDate(selected.due_date)],
                  ["Total",            `₹${Number(selected.amount).toLocaleString()}`],
                  ["Paid",             `₹${Number(selected.paid_amount).toLocaleString()}`],
                  ["Balance",          `₹${(Number(selected.amount) - Number(selected.paid_amount)).toLocaleString()}`],
                ] as [string, string | undefined][]).map(([l, v]) => (
                  <div key={l} className="flex justify-between">
                    <span className="text-muted-foreground">{l}:</span>
                    <span className="font-medium">{v ?? "—"}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge className={statusColor(status)}>{status}</Badge>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}