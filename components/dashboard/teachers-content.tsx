"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Users, Eye, Trash2, Phone, User, Mail, MapPin, Building, Loader2, FileSpreadsheet, Plus, Key } from "lucide-react"
import { teachersApi, getToken } from "@/lib/api"
import * as XLSX from "xlsx"

interface Teacher {
  id: number; name: string; email: string; phone: string
  institute: string; location: string; subjects: string[]
}

export function TeachersContent() {
  const [teachers, setTeachers]   = useState<Teacher[]>([])
  const [loading,  setLoading]    = useState(true)
  const [selected, setSelected]   = useState<Teacher | null>(null)
  const [viewOpen, setViewOpen]   = useState(false)

  useEffect(() => {
    teachersApi.getAll().then((res: any) => setTeachers(res.data))
      .catch(console.error).finally(() => setLoading(false))
  }, [])

  // Selection & Export State
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [includeMonthlyAttendance, setIncludeMonthlyAttendance] = useState(false)
  const [attendanceMonth, setAttendanceMonth] = useState<string>(new Date().toISOString().substring(0, 7))
  const [selectedExportColumns, setSelectedExportColumns] = useState<Set<string>>(
    new Set(["ID", "Name", "Email", "Phone", "Institute", "Location", "Subjects"])
  )

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAllSelection = () => {
    if (selectedIds.size === teachers.length && teachers.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(teachers.map(t => t.id)))
    }
  }

  useEffect(() => {
    setSelectedIds(new Set())
  }, [teachers])

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this teacher?")) return
    try {
      await teachersApi.remove(id)
      setTeachers(prev => prev.filter(t => t.id !== id))
    } catch (err: any) { alert(err.message) }
  }

  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({ name: "", email: "", phone: "", institute: "", location: "", password: "" })

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await teachersApi.create({ ...addForm, subjects: [] })
      setAddOpen(false)
      setAddForm({ name: "", email: "", phone: "", institute: "", location: "", password: "" })
      const res: any = await teachersApi.getAll()
      setTeachers(res.data)
    } catch (err: any) { alert(err.message) }
  }

  const [passwordOpen, setPasswordOpen] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ id: 0, password: "" })
  const [currentPlainPassword, setCurrentPlainPassword] = useState<string | null>(null)
  const [fetchingPassword, setFetchingPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const openPasswordModal = async (teacher: Teacher) => {
    setPasswordForm({ id: teacher.id, password: "" })
    setCurrentPlainPassword(null)
    setShowPassword(false)
    setPasswordOpen(true)
    setFetchingPassword(true)

    try {
      const data = await teachersApi.getPassword(teacher.id)
      if (data.success && data.plainTextPassword) {
        setCurrentPlainPassword(data.plainTextPassword)
      } else {
        setCurrentPlainPassword("Unencrypted or Not set")
      }
    } catch (err) {
      setCurrentPlainPassword("Error fetching password")
    } finally {
      setFetchingPassword(false)
    }
  }

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordForm.password.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }
    try {
      await teachersApi.setPassword(passwordForm.id, { password: passwordForm.password })
      setPasswordOpen(false)
      setPasswordForm({ id: 0, password: "" })
      alert("Password updated successfully!")
    } catch (err: any) { alert(err.message) }
  }

  const handleExportExcel = () => {
    setExportModalOpen(true)
  }

  const confirmExportExcel = async () => {
    const listToExport = selectedIds.size > 0
      ? teachers.filter(t => selectedIds.has(t.id))
      : teachers

    if (listToExport.length === 0) {
      alert("No teachers to export.")
      return
    }

    setIsExporting(true)
    try {
      let attendanceData: Record<number, any> = {}
      let sortedDates: string[] = []

      if (includeMonthlyAttendance) {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://institute-api.rhaitech.online/api"
        const res = await fetch(`${apiBase}/attendance/monthly-report?month=${attendanceMonth}&role=TEACHER`, {
          headers: { "Authorization": `Bearer ${getToken()}` }
        })
        
        if (res.ok) {
          const json = await res.json()
          if (json.success && json.report) {
            const allDates = new Set<string>()
            json.report.forEach((u: any) => {
              attendanceData[u.id] = u.attendance || {}
              Object.keys(u.attendance || {}).forEach(d => allDates.add(d))
            })
            sortedDates = Array.from(allDates).sort()
          }
        } else {
          console.error("Failed to fetch monthly attendance for export")
        }
      }

      const data = listToExport.map(t => {
        const row: any = {}
        if (selectedExportColumns.has("ID")) row["ID"] = t.id
        if (selectedExportColumns.has("Name")) row["Name"] = t.name
        if (selectedExportColumns.has("Email")) row["Email"] = t.email || ""
        if (selectedExportColumns.has("Phone")) row["Phone"] = t.phone || ""
        if (selectedExportColumns.has("Institute")) row["Institute"] = t.institute || ""
        if (selectedExportColumns.has("Location")) row["Location"] = t.location || ""
        if (selectedExportColumns.has("Subjects")) row["Subjects"] = (t.subjects || []).join(", ")

        if (includeMonthlyAttendance) {
          let present = 0, absent = 0, late = 0, onLeave = 0
          sortedDates.forEach(d => {
            const status = attendanceData[t.id]?.[d]?.status || "—"
            row[d] = status
            if (status === "Present") present++
            else if (status === "Absent") absent++
            else if (status === "Late") late++
            else if (status === "On Leave") onLeave++
          })
          row["Total Present"] = present
          row["Total Absent"] = absent
          row["Total Late"] = late
          row["Total Leave"] = onLeave
        }

        return row
      })

      const worksheet = XLSX.utils.json_to_sheet(data)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Teachers")
      XLSX.writeFile(workbook, `Teachers_Export_${new Date().getTime()}.xlsx`)
      setExportModalOpen(false)
    } catch (err) {
      console.error(err)
      alert("An error occurred during export.")
    } finally {
      setIsExporting(false)
    }
  }
  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      <Card>
        {/* <CardHeader> */}
             <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
            <Users className="h-6 w-6" /> Teacher Management
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button onClick={handleExportExcel} variant="outline">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              {selectedIds.size > 0 ? `Export Selected (${selectedIds.size})` : 'Export All'}
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Teacher
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-900">
                    <TableHead className="w-12 text-center">
                      <Checkbox 
                        checked={teachers.length > 0 && selectedIds.size === teachers.length}
                        onCheckedChange={toggleAllSelection}
                        aria-label="Select all"
                        className="border-white/50 data-[state=checked]:bg-white data-[state=checked]:text-slate-900"
                      />
                    </TableHead>
                    <TableHead className="text-white font-semibold">Name</TableHead>
                    <TableHead className="text-white font-semibold hidden sm:table-cell">Email</TableHead>
                    <TableHead className="text-white font-semibold hidden md:table-cell">Phone</TableHead>
                    <TableHead className="text-white font-semibold hidden lg:table-cell">Institute</TableHead>
                    <TableHead className="text-white font-semibold">Location</TableHead>
                    <TableHead className="text-white font-semibold text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teachers.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No teachers found</TableCell></TableRow>
                  ) : teachers.map(t => (
                    <TableRow key={t.id} className="hover:bg-muted/50">
                      <TableCell className="text-center">
                        <Checkbox 
                          checked={selectedIds.has(t.id)}
                          onCheckedChange={() => toggleSelection(t.id)}
                          aria-label={`Select ${t.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell className="hidden sm:table-cell">{t.email}</TableCell>
                      <TableCell className="hidden md:table-cell">{t.phone}</TableCell>
                      <TableCell className="hidden lg:table-cell">{t.institute}</TableCell>
                      <TableCell>{t.location}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button size="sm" variant="outline" className="h-8 w-8 p-0"
                            onClick={() => { setSelected(t); setViewOpen(true) }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 w-8 p-0"
                            onClick={() => openPasswordModal(t)}>
                            <Key className="h-4 w-4 text-blue-500" />
                          </Button>
                          <Button size="sm" variant="destructive" className="h-8 w-8 p-0"
                            onClick={() => handleDelete(t.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Teacher Details</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-2xl font-bold">
                  {selected.name.charAt(0)}
                </div>
              </div>
              {[
                { icon: User,     label: "Name",      value: selected.name },
                { icon: Mail,     label: "Email",     value: selected.email },
                { icon: Phone,    label: "Phone",     value: selected.phone },
                { icon: Building, label: "Institute", value: selected.institute },
                { icon: MapPin,   label: "Location",  value: selected.location },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div><p className="text-sm text-muted-foreground">{label}</p><p className="font-medium">{value}</p></div>
                </div>
              ))}
              {selected.subjects?.length > 0 && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Subjects</p>
                  <div className="flex flex-wrap gap-2">
                    {selected.subjects.map(s => <Badge key={s} variant="secondary">{s}</Badge>)}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Teacher</DialogTitle></DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4 mt-4">
            <div className="space-y-2"><Label>Name *</Label><Input required value={addForm.name} onChange={e => setAddForm({...addForm, name: e.target.value})} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={addForm.email} onChange={e => setAddForm({...addForm, email: e.target.value})} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={addForm.phone} onChange={e => setAddForm({...addForm, phone: e.target.value})} /></div>
            <div className="space-y-2"><Label>Institute</Label><Input value={addForm.institute} onChange={e => setAddForm({...addForm, institute: e.target.value})} /></div>
            <div className="space-y-2"><Label>Location</Label><Input value={addForm.location} onChange={e => setAddForm({...addForm, location: e.target.value})} /></div>
            <div className="space-y-2"><Label>Password</Label><Input type="password" value={addForm.password} onChange={e => setAddForm({...addForm, password: e.target.value})} placeholder="Set initial password" /></div>
            <Button type="submit" className="w-full">Save Teacher</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Manage Password</DialogTitle></DialogHeader>
          
          <div className="bg-muted p-4 rounded-lg flex flex-col gap-2 mt-4 relative">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Current Password</Label>
            {fetchingPassword ? (
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                Fetching...
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="font-mono text-base font-medium">
                  {showPassword ? currentPlainPassword : "••••••••"}
                </p>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <form onSubmit={handleSetPassword} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Set New Password</Label>
              <Input 
                required 
                type="password" 
                placeholder="Enter new password (min 6 chars)"
                value={passwordForm.password} 
                onChange={e => setPasswordForm({...passwordForm, password: e.target.value})} 
              />
            </div>
            <Button type="submit" className="w-full">Update Password</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Export Modal */}
      <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Custom Export</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Select the columns you want to include in the export.
              {selectedIds.size > 0 
                ? ` You are exporting ${selectedIds.size} selected teacher(s).` 
                : ' You are exporting all teachers.'}
            </p>
            <div className="grid grid-cols-2 gap-4 max-h-[300px] overflow-y-auto p-1 mb-6 border-b pb-4">
              {[
                "ID", "Name", "Email", "Phone", "Institute", "Location", "Subjects"
              ].map(col => (
                <div key={col} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`col-${col}`}
                    checked={selectedExportColumns.has(col)}
                    onCheckedChange={(checked) => {
                      setSelectedExportColumns(prev => {
                        const next = new Set(prev)
                        if (checked) next.add(col)
                        else next.delete(col)
                        return next
                      })
                    }}
                  />
                  <label 
                    htmlFor={`col-${col}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {col}
                  </label>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Additional Data</h4>
              <div className="flex flex-col gap-3">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="inc-attendance"
                    checked={includeMonthlyAttendance}
                    onCheckedChange={(c) => setIncludeMonthlyAttendance(!!c)}
                  />
                  <label htmlFor="inc-attendance" className="text-sm font-medium">
                    Include Monthly Attendance
                  </label>
                </div>
                {includeMonthlyAttendance && (
                  <div className="pl-6">
                    <Input 
                      type="month" 
                      value={attendanceMonth} 
                      onChange={e => setAttendanceMonth(e.target.value)}
                      className="w-48 h-8 text-sm"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportModalOpen(false)}>Cancel</Button>
            <Button onClick={confirmExportExcel} disabled={selectedExportColumns.size === 0 || isExporting}>
              {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {isExporting ? "Generating..." : "Download Excel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
