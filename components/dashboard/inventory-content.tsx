"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Package, Search, Plus, Download, AlertTriangle, Trash2, Edit2, RotateCcw } from "lucide-react"
import { inventoryApi, studentsApi, getToken } from "@/lib/api"
import { cn } from "@/lib/utils"

interface InventoryItem {
  id: number; name: string; category: string; variant: string;
  total_stock: number; distributed_count: number; remaining_stock: number; description: string;
}

interface Summary {
  total_items: number; total_stock: number; total_distributed: number; low_stock_count: number;
}

interface Distribution {
  id: number; quantity: number; notes: string; distributed_at: string;
  item_name: string; item_category: string; variant: string;
  student_name: string; student_standard: string; student_board: string; student_id: number; item_id: number;
}

interface Student {
  id: number; name: string; standard: string; board: string;
}

export function InventoryContent() {
  const [activeTab, setActiveTab] = useState("items")
  const [loading, setLoading] = useState(false)

  // Data State
  const [items, setItems] = useState<InventoryItem[]>([])
  const [summary, setSummary] = useState<Summary>({ total_items: 0, total_stock: 0, total_distributed: 0, low_stock_count: 0 })
  const [distributions, setDistributions] = useState<Distribution[]>([])
  const [students, setStudents] = useState<Student[]>([])

  // Items Tab State
  const [itemSearch, setItemSearch] = useState("")
  const [itemCategory, setItemCategory] = useState("All")
  
  // Item Dialog State
  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [iName, setIName] = useState("")
  const [iCategory, setICategory] = useState("Other")
  const [iVariant, setIVariant] = useState("")
  const [iTotalStock, setITotalStock] = useState("")
  const [iDescription, setIDescription] = useState("")

  // Distribute Tab State
  const [dItemId, setDItemId] = useState<string>("")
  const [dQty, setDQty] = useState("1")
  const [dNotes, setDNotes] = useState("")
  const [dSearch, setDSearch] = useState("")
  const [dStandard, setDStandard] = useState("All")
  const [dBoard, setDBoard] = useState("All")
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([])

  // History Tab State
  const [hSearch, setHSearch] = useState("")

  const loadSummary = useCallback(async () => {
    try {
      const res: any = await inventoryApi.getSummary()
      setSummary(res.data)
    } catch (err) { console.error(err) }
  }, [])

  const loadItems = useCallback(async () => {
    try {
      const res: any = await inventoryApi.getItems({ search: itemSearch, category: itemCategory === "All" ? "" : itemCategory })
      setItems(res.data)
    } catch (err) { console.error(err) }
  }, [itemSearch, itemCategory])

  const loadDistributions = useCallback(async () => {
    try {
      const res: any = await inventoryApi.getDistributions({ search: hSearch })
      setDistributions(res.data)
    } catch (err) { console.error(err) }
  }, [hSearch])

  const loadStudents = useCallback(async () => {
    try {
      const res: any = await studentsApi.getAll()
      setStudents(res.data)
    } catch (err) { console.error(err) }
  }, [])

  // Initial Load
  useEffect(() => {
    loadSummary()
    loadStudents()
  }, [loadSummary, loadStudents])

  // Tab specific reloads
  useEffect(() => {
    if (activeTab === "items") loadItems()
    if (activeTab === "history") loadDistributions()
    if (activeTab === "distribute") loadItems() // Need latest stock for dropdown
  }, [activeTab, loadItems, loadDistributions])

  // --- Handlers: Items ---
  const openNewItemDialog = () => {
    setEditingItem(null)
    setIName(""); setICategory("Other"); setIVariant(""); setITotalStock(""); setIDescription("")
    setItemDialogOpen(true)
  }

  const openEditItemDialog = (item: InventoryItem) => {
    setEditingItem(item)
    setIName(item.name); setICategory(item.category); setIVariant(item.variant); 
    setITotalStock(item.total_stock.toString()); setIDescription(item.description || "")
    setItemDialogOpen(true)
  }

  const handleSaveItem = async () => {
    if (!iName || !iTotalStock) return alert("Name and Total Stock are required.")
    try {
      const data = { name: iName, category: iCategory, variant: iVariant, total_stock: parseInt(iTotalStock), description: iDescription }
      if (editingItem) {
        await inventoryApi.updateItem(editingItem.id, data)
      } else {
        await inventoryApi.createItem(data)
      }
      setItemDialogOpen(false)
      loadItems()
      loadSummary()
    } catch (err: any) { alert(err.message) }
  }

  const handleDeleteItem = async (id: number) => {
    if (!confirm("Delete this item? This action cannot be undone.")) return
    try {
      await inventoryApi.deleteItem(id)
      loadItems()
      loadSummary()
    } catch (err: any) { alert(err.message) }
  }

  // --- Handlers: Distribute ---
  const toggleStudentSelection = (id: number) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
    )
  }
  const selectAllFilteredStudents = (filteredStudents: Student[]) => {
    const allIds = filteredStudents.map(s => s.id)
    if (selectedStudentIds.length === allIds.length) setSelectedStudentIds([]) // deselect all
    else setSelectedStudentIds(allIds)
  }

  const handleDistribute = async () => {
    if (!dItemId) return alert("Select an item first.")
    if (selectedStudentIds.length === 0) return alert("Select at least one student.")
    const qty = parseInt(dQty)
    if (qty <= 0) return alert("Quantity must be greater than 0.")

    const item = items.find(i => i.id.toString() === dItemId)
    if (!item) return
    const required = qty * selectedStudentIds.length
    if (required > item.remaining_stock) {
      return alert(`Insufficient stock. Need ${required} but only ${item.remaining_stock} available.`)
    }

    if (!confirm(`Distribute ${qty}x ${item.name} to ${selectedStudentIds.length} students?`)) return

    try {
      await inventoryApi.distribute({
        item_id: parseInt(dItemId),
        student_ids: selectedStudentIds,
        quantity: qty,
        notes: dNotes
      })
      alert("Distribution successful!")
      setSelectedStudentIds([])
      setDNotes("")
      loadSummary()
      // reload items to get updated stock
      loadItems() 
    } catch (err: any) { alert(err.message) }
  }

  // --- Handlers: History ---
  const handleUndoDistribution = async (id: number) => {
    if (!confirm("Undo this distribution? The stock will be returned.")) return
    try {
      await inventoryApi.undoDistribution(id)
      loadDistributions()
      loadSummary()
    } catch (err: any) { alert(err.message) }
  }

  // --- Handlers: Export ---
  const handleExport = async (type: "items" | "distributions") => {
    const token = getToken()
    const url = type === "items" ? inventoryApi.exportItemsUrl() : inventoryApi.exportDistributionsUrl("")
    
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error("Export failed")
      const blob = await res.blob()
      const a = document.createElement("a")
      a.href = URL.createObjectURL(blob)
      a.download = type === "items" ? "inventory_items.csv" : "distribution_history.csv"
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (err: any) {
      alert("Error exporting: " + err.message)
    }
  }


  // Filtered Students for Distribute Tab
  const filteredStudents = students.filter(s => {
    if (dStandard !== "All" && s.standard !== dStandard) return false;
    if (dBoard !== "All" && s.board !== dBoard) return false;
    if (dSearch && !s.name.toLowerCase().includes(dSearch.toLowerCase())) return false;
    return true;
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <Package className="h-6 w-6 text-primary" />
          Inventory Management
        </h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-500">Total Items</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary.total_items}</div></CardContent>
        </Card>
        <Card className="bg-white">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-500">Total Stock</CardTitle>
            <Plus className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary.total_stock}</div></CardContent>
        </Card>
        <Card className="bg-white">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-500">Total Distributed</CardTitle>
            <RotateCcw className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary.total_distributed}</div></CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-red-700">Low Stock Alert</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-700">{summary.low_stock_count}</div></CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="items">Items & Stock</TabsTrigger>
          <TabsTrigger value="distribute">Distribute</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>

        {/* ── ITEMS TAB ── */}
        <TabsContent value="items" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Inventory List</CardTitle>
              <Button onClick={openNewItemDialog}><Plus className="h-4 w-4 mr-2"/> Add Item</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search items..." className="pl-8" value={itemSearch} onChange={e => setItemSearch(e.target.value)} />
                </div>
                <Select value={itemCategory} onValueChange={setItemCategory}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Categories</SelectItem>
                    <SelectItem value="Clothing">Clothing</SelectItem>
                    <SelectItem value="Books">Books</SelectItem>
                    <SelectItem value="Bags">Bags</SelectItem>
                    <SelectItem value="Stationery">Stationery</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Variant</TableHead>
                      <TableHead className="text-right">Total Stock</TableHead>
                      <TableHead className="text-right">Distributed</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>{item.variant || "—"}</TableCell>
                        <TableCell className="text-right">{item.total_stock}</TableCell>
                        <TableCell className="text-right">{item.distributed_count}</TableCell>
                        <TableCell className="text-right">
                          <span className={cn("px-2 py-1 rounded-full text-xs font-semibold", 
                            item.remaining_stock < 10 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                          )}>
                            {item.remaining_stock}
                          </span>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="ghost" size="icon" onClick={() => openEditItemDialog(item)}><Edit2 className="h-4 w-4 text-blue-600"/></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id)}><Trash2 className="h-4 w-4 text-red-600"/></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {items.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground h-24">No items found.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── DISTRIBUTE TAB ── */}
        <TabsContent value="distribute" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-6">
              <Card>
                <CardHeader><CardTitle>Distribution Details</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Item</Label>
                    <Select value={dItemId} onValueChange={setDItemId}>
                      <SelectTrigger><SelectValue placeholder="Choose an item..." /></SelectTrigger>
                      <SelectContent>
                        {items.filter(i => i.remaining_stock > 0).map(item => (
                          <SelectItem key={item.id} value={item.id.toString()}>
                            {item.name} {item.variant ? `(${item.variant})` : ""} — {item.remaining_stock} left
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity per student</Label>
                    <Input type="number" min="1" value={dQty} onChange={e => setDQty(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes (Optional)</Label>
                    <Input placeholder="e.g. Admission Kit" value={dNotes} onChange={e => setDNotes(e.target.value)} />
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                    <div className="text-sm flex justify-between mb-2">
                      <span className="text-gray-500">Selected Students:</span>
                      <span className="font-bold">{selectedStudentIds.length}</span>
                    </div>
                    <div className="text-sm flex justify-between mb-4">
                      <span className="text-gray-500">Items Required:</span>
                      <span className="font-bold">{selectedStudentIds.length * (parseInt(dQty)||0)}</span>
                    </div>
                    <Button className="w-full" onClick={handleDistribute} disabled={selectedStudentIds.length === 0 || !dItemId}>
                      Distribute Items
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-2">
              <Card>
                <CardHeader><CardTitle>Select Students</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search students..." className="pl-8" value={dSearch} onChange={e => setDSearch(e.target.value)} />
                    </div>
                    <Select value={dStandard} onValueChange={setDStandard}>
                      <SelectTrigger className="w-[120px]"><SelectValue placeholder="Standard" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All">All Stds</SelectItem>
                        {Array.from(new Set(students.map(s => s.standard))).filter(Boolean).map(std => (
                           <SelectItem key={std} value={std}>{std}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="border rounded-md max-h-[500px] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                        <TableRow>
                          <TableHead className="w-[50px]">
                            <input 
                              type="checkbox" 
                              className="h-4 w-4 rounded border-gray-300 text-primary"
                              checked={filteredStudents.length > 0 && selectedStudentIds.length === filteredStudents.length}
                              onChange={() => selectAllFilteredStudents(filteredStudents)}
                            />
                          </TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Standard</TableHead>
                          <TableHead>Board</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStudents.map(student => (
                          <TableRow key={student.id} className="cursor-pointer hover:bg-gray-50" onClick={() => toggleStudentSelection(student.id)}>
                            <TableCell onClick={e => e.stopPropagation()}>
                              <input 
                                type="checkbox" 
                                className="h-4 w-4 rounded border-gray-300 text-primary"
                                checked={selectedStudentIds.includes(student.id)}
                                onChange={() => toggleStudentSelection(student.id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{student.name}</TableCell>
                            <TableCell>{student.standard}</TableCell>
                            <TableCell>{student.board}</TableCell>
                          </TableRow>
                        ))}
                        {filteredStudents.length === 0 && (
                          <TableRow><TableCell colSpan={4} className="text-center py-8 text-gray-500">No students found.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── HISTORY TAB ── */}
        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Distribution History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search student or item..." className="pl-8" value={hSearch} onChange={e => setHSearch(e.target.value)} />
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {distributions.map(dist => (
                      <TableRow key={dist.id}>
                        <TableCell className="whitespace-nowrap">{new Date(dist.distributed_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {dist.student_name ? (
                            <span className="font-medium">{dist.student_name}</span>
                          ) : (
                            <span className="italic text-gray-400">[Deleted Student]</span>
                          )}
                          <div className="text-xs text-gray-500">{dist.student_standard} • {dist.student_board}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{dist.item_name}</div>
                          <div className="text-xs text-gray-500">{dist.item_category} {dist.variant ? `• ${dist.variant}` : ""}</div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{dist.quantity}</TableCell>
                        <TableCell className="text-sm text-gray-600 max-w-[200px] truncate" title={dist.notes}>{dist.notes || "—"}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleUndoDistribution(dist.id)} title="Undo Distribution">
                            <RotateCcw className="h-4 w-4 text-orange-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {distributions.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">No history found.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── EXPORT TAB ── */}
        <TabsContent value="export" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Export Inventory List</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">Download a complete CSV of all inventory items, including their categories, total stock, distributed count, and remaining stock.</p>
                <Button onClick={() => handleExport("items")} variant="outline" className="w-full flex items-center justify-center gap-2">
                  <Download className="h-4 w-4" /> Download Items CSV
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Export Distribution History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">Download a comprehensive log of all item distributions, including which student received what item and when.</p>
                <Button onClick={() => handleExport("distributions")} variant="outline" className="w-full flex items-center justify-center gap-2">
                  <Download className="h-4 w-4" /> Download History CSV
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Add/Edit Dialog ── */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Item" : "Add New Item"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Name <span className="text-red-500">*</span></Label>
              <Input placeholder="e.g. Science Textbook" value={iName} onChange={e => setIName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Category <span className="text-red-500">*</span></Label>
              <Select value={iCategory} onValueChange={setICategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Clothing">Clothing</SelectItem>
                  <SelectItem value="Books">Books</SelectItem>
                  <SelectItem value="Bags">Bags</SelectItem>
                  <SelectItem value="Stationery">Stationery</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Variant (Optional)</Label>
              <Input placeholder="e.g. Size M, Blue, 2024 Edition" value={iVariant} onChange={e => setIVariant(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Total Stock <span className="text-red-500">*</span></Label>
              <Input type="number" min="0" placeholder="0" value={iTotalStock} onChange={e => setITotalStock(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Input placeholder="Brief details about the item..." value={iDescription} onChange={e => setIDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveItem}>Save Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
