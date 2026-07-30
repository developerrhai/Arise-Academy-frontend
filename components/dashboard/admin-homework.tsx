"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search, BookOpen, Users, CheckCircle, Clock, Eye, AlertCircle, Calendar } from "lucide-react"
import { homeworkApi } from "@/lib/api"

interface Homework {
  id: number
  title: string
  description: string
  subject: string
  batch: string
  teacher_id: number
  teacher_name: string
  due_date: string
  attachment_url: string | null
  created_at: string
  completed_count: number
  late_count: number
  total_students: number
}

interface StudentStatus {
  id: number
  name: string
  email: string | null
  phone: string
  standard: string
  course: string
  status: "Pending" | "Completed" | "Late"
  feedback: string
}

export function AdminHomeworkContent() {
  const [homeworks, setHomeworks] = useState<Homework[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  // Details Modal
  const [selectedHw, setSelectedHw] = useState<Homework | null>(null)
  const [students, setStudents] = useState<StudentStatus[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const fetchAllHomeworks = useCallback(async () => {
    setLoading(true)
    try {
      const res = await homeworkApi.getAllHomeworkAdmin()
      setHomeworks(res.data || [])
    } catch (err) {
      console.error("Failed to load admin homework overview:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAllHomeworks()
  }, [fetchAllHomeworks])

  const openDetailsModal = async (hw: Homework) => {
    setSelectedHw(hw)
    setDetailsOpen(true)
    setLoadingStudents(true)
    try {
      const res = await homeworkApi.getHomeworkStudents(hw.id)
      setStudents(res.data || [])
    } catch (err) {
      console.error("Failed to fetch student homework statuses:", err)
    } finally {
      setLoadingStudents(false)
    }
  }

  // Filter homeworks based on search query
  const filteredHomeworks = homeworks.filter((hw) => {
    const query = searchQuery.toLowerCase()
    return (
      hw.title.toLowerCase().includes(query) ||
      hw.subject.toLowerCase().includes(query) ||
      hw.batch.toLowerCase().includes(query) ||
      (hw.teacher_name && hw.teacher_name.toLowerCase().includes(query))
    )
  })

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      <div>
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 md:text-2xl">
          <BookOpen className="h-6 w-6 text-primary" /> Teacher Homework Overview
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor homework assignments, check completion statistics, and view student submission statuses across all teachers.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by teacher, batch, subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={fetchAllHomeworks} variant="outline" size="sm" className="w-full sm:w-auto">
          Refresh List
        </Button>
      </div>

      <Card className="shadow-sm border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Homework List</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredHomeworks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm flex flex-col items-center gap-2">
              <AlertCircle className="h-8 w-8 text-slate-400" />
              <span>No homework records found matching your filters.</span>
            </div>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-900">
                    <TableHead className="text-white font-semibold">Subject</TableHead>
                    <TableHead className="text-white font-semibold">Homework Title</TableHead>
                    <TableHead className="text-white font-semibold">Assigned By</TableHead>
                    <TableHead className="text-white font-semibold">Batch / Class</TableHead>
                    <TableHead className="text-white font-semibold">Due Date</TableHead>
                    <TableHead className="text-white font-semibold text-center">Completion Rate</TableHead>
                    <TableHead className="text-white font-semibold text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHomeworks.map((hw) => {
                    const completedTotal = hw.completed_count + hw.late_count
                    const rate = hw.total_students > 0 ? Math.round((completedTotal / hw.total_students) * 100) : 0
                    const isOverdue = new Date(hw.due_date) < new Date() && rate < 100

                    return (
                      <TableRow key={hw.id} className="hover:bg-muted/30">
                        <TableCell className="font-semibold text-slate-900">{hw.subject}</TableCell>
                        <TableCell className="font-medium text-slate-700 max-w-[200px] truncate" title={hw.title}>
                          {hw.title}
                        </TableCell>
                        <TableCell className="text-slate-700 font-medium">
                          {hw.teacher_name || "Unknown Teacher"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 whitespace-nowrap">
                            {hw.batch}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(hw.due_date).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-center min-w-[140px]">
                          <div className="flex flex-col items-center">
                            <div className="flex justify-between w-full text-xs font-semibold text-slate-700 px-1 mb-1">
                              <span>{completedTotal}/{hw.total_students} Done</span>
                              <span>{rate}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-300",
                                  rate >= 80 ? "bg-emerald-500" : rate >= 50 ? "bg-amber-500" : "bg-rose-500"
                                )}
                                style={{ width: `${rate}%` }}
                              />
                            </div>
                            {isOverdue && (
                              <span className="text-[10px] text-rose-500 font-medium mt-1 flex items-center gap-0.5">
                                <Clock className="h-2.5 w-2.5" /> Overdue
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDetailsModal(hw)}
                            className="text-slate-600 hover:text-slate-800 border-slate-200 hover:bg-slate-50 h-8 flex items-center gap-1.5 mx-auto"
                          >
                            <Eye className="h-4 w-4" /> View Status
                          </Button>
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

      {/* DETAILS DIALOG */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold border-b pb-2">
              <Users className="h-5 w-5 text-primary" /> Submission Progress — {selectedHw?.title}
            </DialogTitle>
          </DialogHeader>

          {loadingStudents ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4 py-2 text-sm">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-2.5 rounded-lg border text-center">
                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Teacher</p>
                  <p className="font-bold text-slate-800 truncate mt-0.5">{selectedHw?.teacher_name}</p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border text-center">
                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Class / Batch</p>
                  <p className="font-bold text-slate-800 truncate mt-0.5">{selectedHw?.batch}</p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border text-center">
                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Subject</p>
                  <p className="font-bold text-slate-800 truncate mt-0.5">{selectedHw?.subject}</p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border text-center">
                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Due Date</p>
                  <p className="font-bold text-slate-800 truncate mt-0.5">
                    {selectedHw?.due_date ? new Date(selectedHw.due_date).toLocaleDateString() : ""}
                  </p>
                </div>
              </div>

              {selectedHw?.description && (
                <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-100 text-xs text-amber-800">
                  <span className="font-bold block mb-1">Homework Details:</span>
                  <p className="whitespace-pre-wrap">{selectedHw.description}</p>
                </div>
              )}

              {/* Student status table */}
              <div className="rounded-lg border overflow-x-auto max-h-[35vh] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10">
                    <TableRow className="bg-muted/45">
                      <TableHead>Student Name</TableHead>
                      <TableHead>Submission Status</TableHead>
                      <TableHead>Teacher Feedback</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                          No students found in this batch.
                        </TableCell>
                      </TableRow>
                    ) : (
                      students.map((student) => (
                        <TableRow key={student.id} className="hover:bg-muted/20">
                          <TableCell className="font-semibold text-slate-700">{student.name}</TableCell>
                          <TableCell>
                            {student.status === "Completed" ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1 w-fit">
                                <CheckCircle className="h-3 w-3" /> Completed
                              </Badge>
                            ) : student.status === "Late" ? (
                              <Badge className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1 w-fit">
                                <Clock className="h-3 w-3" /> Late
                              </Badge>
                            ) : (
                              <Badge className="bg-rose-50 text-rose-700 border-rose-200 flex items-center gap-1 w-fit">
                                <AlertCircle className="h-3 w-3" /> Pending
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground italic text-xs max-w-[150px] truncate" title={student.feedback || "No feedback provided"}>
                            {student.feedback || "—"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <DialogFooter className="border-t pt-3">
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Utility cn function locally defined/used in case it's not exported as default
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ")
}
