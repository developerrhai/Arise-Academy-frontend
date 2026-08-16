"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building, BookOpen, Plus, Trash2, Loader2, Edit } from "lucide-react"
import { branchesApi, batchesApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"

export function BranchesBatchesContent() {
  const [activeTab, setActiveTab] = useState("branches")
  
  // Branches State
  const [branches, setBranches] = useState<any[]>([])
  const [loadingBranches, setLoadingBranches] = useState(true)
  const [branchDialogOpen, setBranchDialogOpen] = useState(false)
  const [editingBranch, setEditingBranch] = useState<any>(null)
  const [branchName, setBranchName] = useState("")

  // Batches State
  const [batches, setBatches] = useState<any[]>([])
  const [loadingBatches, setLoadingBatches] = useState(false)
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all")
  const [batchDialogOpen, setBatchDialogOpen] = useState(false)
  const [editingBatch, setEditingBatch] = useState<any>(null)
  
  const [batchForm, setBatchForm] = useState({
    branch_id: "",
    batch_name: "",
    start_time: "",
    end_time: "",
    batch_start_date: "",
    batch_end_date: ""
  })

  useEffect(() => {
    fetchBranches()
  }, [])

  useEffect(() => {
    if (activeTab === "batches") {
      fetchBatches()
    }
  }, [activeTab, selectedBranchId])

  // --- Branches Logic ---
  const fetchBranches = async () => {
    setLoadingBranches(true)
    try {
      const res = await branchesApi.getAll()
      setBranches(res.branches || [])
    } catch (err: any) {
      toast({ title: "Error fetching branches", description: err.message, variant: "destructive" })
    } finally {
      setLoadingBranches(false)
    }
  }

  const handleSaveBranch = async () => {
    if (!branchName.trim()) return toast({ title: "Validation Error", description: "Branch name is required", variant: "destructive" })
    try {
      if (editingBranch) {
        await branchesApi.update(editingBranch.branch_id, { branch_name: branchName })
        toast({ title: "Success", description: "Branch updated" })
      } else {
        await branchesApi.create({ branch_name: branchName })
        toast({ title: "Success", description: "Branch created" })
      }
      setBranchDialogOpen(false)
      fetchBranches()
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    }
  }

  const handleDeleteBranch = async (id: number) => {
    if (!confirm("Delete this branch? It may contain batches.")) return
    try {
      await branchesApi.remove(id)
      toast({ title: "Success", description: "Branch deleted" })
      fetchBranches()
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    }
  }

  const openBranchDialog = (branch: any = null) => {
    setEditingBranch(branch)
    setBranchName(branch ? branch.branch_name : "")
    setBranchDialogOpen(true)
  }

  // --- Batches Logic ---
  const fetchBatches = async () => {
    if (selectedBranchId === "all") {
      // If we don't have an endpoint for all batches, we could fetch batches for each branch, or just require a branch selection.
      // Assuming batchesApi.getByBranch works with a generic call if we want to show all. Wait, backend requires branch_id.
      // We will just clear batches if "all" or fetch for the first branch.
      // Actually, looking at backend: `if (branch_id) query += " WHERE branch_id = ?"` but the route requires `/:branch_id`.
      // Let's just fetch them individually or ask the user to select a branch.
      setBatches([])
      return
    }
    setLoadingBatches(true)
    try {
      const res = await batchesApi.getByBranch(selectedBranchId)
      setBatches(res.data || [])
    } catch (err: any) {
      toast({ title: "Error fetching batches", description: err.message, variant: "destructive" })
    } finally {
      setLoadingBatches(false)
    }
  }

  const handleSaveBatch = async () => {
    const { branch_id, batch_name, start_time, end_time, batch_start_date, batch_end_date } = batchForm
    if (!branch_id || !batch_name || !start_time || !end_time || !batch_start_date || !batch_end_date) {
      return toast({ title: "Validation Error", description: "All fields are required", variant: "destructive" })
    }
    try {
      if (editingBatch) {
        await batchesApi.update(editingBatch.batch_id, batchForm)
        toast({ title: "Success", description: "Batch updated" })
      } else {
        await batchesApi.create(batchForm)
        toast({ title: "Success", description: "Batch created" })
      }
      setBatchDialogOpen(false)
      if (selectedBranchId === branch_id) {
        fetchBatches()
      } else {
        setSelectedBranchId(branch_id)
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    }
  }

  const handleDeleteBatch = async (id: number) => {
    if (!confirm("Delete this batch?")) return
    try {
      await batchesApi.remove(id)
      toast({ title: "Success", description: "Batch deleted" })
      fetchBatches()
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    }
  }

  const openBatchDialog = (batch: any = null) => {
    setEditingBatch(batch)
    if (batch) {
      setBatchForm({
        branch_id: batch.branch_id.toString(),
        batch_name: batch.batch_name,
        start_time: batch.start_time,
        end_time: batch.end_time,
        batch_start_date: batch.batch_start_date.split('T')[0], // format for date input
        batch_end_date: batch.batch_end_date.split('T')[0]
      })
    } else {
      setBatchForm({
        branch_id: selectedBranchId !== "all" ? selectedBranchId : "",
        batch_name: "",
        start_time: "",
        end_time: "",
        batch_start_date: "",
        batch_end_date: ""
      })
    }
    setBatchDialogOpen(true)
  }

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
            <Building className="h-6 w-6" /> Branches & Batches
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-6 grid w-full grid-cols-2 lg:w-[400px]">
              <TabsTrigger value="branches">Branches</TabsTrigger>
              <TabsTrigger value="batches">Batches</TabsTrigger>
            </TabsList>

            {/* BRANCHES TAB */}
            <TabsContent value="branches">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Manage Branches</h3>
                <Button onClick={() => openBranchDialog()} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Add Branch
                </Button>
              </div>

              {loadingBranches ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : (
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-900">
                        <TableHead className="text-white font-semibold">ID</TableHead>
                        <TableHead className="text-white font-semibold w-full">Branch Name</TableHead>
                        <TableHead className="text-white font-semibold text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {branches.length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No branches found</TableCell></TableRow>
                      ) : branches.map(b => (
                        <TableRow key={b.branch_id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">{b.branch_id}</TableCell>
                          <TableCell>{b.branch_name}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => openBranchDialog(b)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="destructive" className="h-8 w-8 p-0" onClick={() => handleDeleteBranch(b.branch_id)}>
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
            </TabsContent>

            {/* BATCHES TAB */}
            <TabsContent value="batches">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold shrink-0">Manage Batches</h3>
                  <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select Branch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">-- Select a Branch --</SelectItem>
                      {branches.map(b => (
                        <SelectItem key={b.branch_id} value={b.branch_id.toString()}>{b.branch_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => openBatchDialog()} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Add Batch
                </Button>
              </div>

              {selectedBranchId === "all" ? (
                <div className="text-center py-12 text-muted-foreground border rounded-lg">
                  Please select a branch to view its batches.
                </div>
              ) : loadingBatches ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : (
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-900">
                        <TableHead className="text-white font-semibold">Name</TableHead>
                        <TableHead className="text-white font-semibold">Time</TableHead>
                        <TableHead className="text-white font-semibold">Duration</TableHead>
                        <TableHead className="text-white font-semibold text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {batches.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No batches found for this branch</TableCell></TableRow>
                      ) : batches.map(b => (
                        <TableRow key={b.batch_id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">{b.batch_name}</TableCell>
                          <TableCell>{b.start_time} - {b.end_time}</TableCell>
                          <TableCell>
                            {new Date(b.batch_start_date).toLocaleDateString()} to {new Date(b.batch_end_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => openBatchDialog(b)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="destructive" className="h-8 w-8 p-0" onClick={() => handleDeleteBatch(b.batch_id)}>
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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Branch Dialog */}
      <Dialog open={branchDialogOpen} onOpenChange={setBranchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBranch ? "Edit Branch" : "Add Branch"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Branch Name</Label>
              <Input value={branchName} onChange={(e) => setBranchName(e.target.value)} placeholder="e.g. Main Campus" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBranchDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveBranch}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Dialog */}
      <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingBatch ? "Edit Batch" : "Add Batch"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Branch</Label>
              <Select value={batchForm.branch_id} onValueChange={(val) => setBatchForm(p => ({ ...p, branch_id: val }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map(b => (
                    <SelectItem key={b.branch_id} value={b.branch_id.toString()}>{b.branch_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Batch Name</Label>
              <Input value={batchForm.batch_name} onChange={(e) => setBatchForm(p => ({ ...p, batch_name: e.target.value }))} placeholder="e.g. Morning Batch" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input type="time" value={batchForm.start_time} onChange={(e) => setBatchForm(p => ({ ...p, start_time: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input type="time" value={batchForm.end_time} onChange={(e) => setBatchForm(p => ({ ...p, end_time: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={batchForm.batch_start_date} onChange={(e) => setBatchForm(p => ({ ...p, batch_start_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={batchForm.batch_end_date} onChange={(e) => setBatchForm(p => ({ ...p, batch_end_date: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveBatch}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
