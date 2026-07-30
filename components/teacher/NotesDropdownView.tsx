"use client";

import { useEffect, useState, useMemo } from "react";
import { ArrowLeft, ChevronRight, Plus, Save, Loader2, ExternalLink, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import Link from "next/link";
import { 
  getBranches, getBatches, getBoards, getStandards, 
  getSubjects, getChapters, getNotes, createCategories, getTeachers 
} from "@/lib/notesApi";

type Note = {
  note_id: string;
  title: string;
  description: string;
  file_url: string;
};

export function NotesDropdownView() {
  const [open, setOpen] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);

  // Data states
  const [branches, setBranches] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [boards, setBoards] = useState<any[]>([]);
  const [standards, setStandards] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);

  // Selection states
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [selectedBoardId, setSelectedBoardId] = useState<string>("");
  const [selectedStandardId, setSelectedStandardId] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedChapterId, setSelectedChapterId] = useState<string>("");

  // Get active object details
  const selectedBranch = useMemo(() => branches.find(b => String(b.branch_id) === selectedBranchId), [branches, selectedBranchId]);
  const selectedBatch = useMemo(() => batches.find(b => String(b.batch_id) === selectedBatchId), [batches, selectedBatchId]);
  const selectedBoard = useMemo(() => boards.find(b => String(b.board_id) === selectedBoardId), [boards, selectedBoardId]);
  const selectedStandard = useMemo(() => standards.find(s => String(s.stand_id) === selectedStandardId), [standards, selectedStandardId]);
  const selectedSubject = useMemo(() => subjects.find(s => String(s.sub_id) === selectedSubjectId), [subjects, selectedSubjectId]);
  const selectedChapter = useMemo(() => chapters.find(c => String(c.chap_id) === selectedChapterId), [chapters, selectedChapterId]);

  // --- Fetch Methods ---
  const loadBranches = async () => {
    try {
      const data = await getBranches();
      setBranches(data?.data?.branches || data?.branches || []);
    } catch (err) { 
      toast.error("Failed to load branches"); 
    }
  };

  const loadBoards = async () => {
    try {
      const data = await getBoards();
      setBoards(data?.data || data || []);
    } catch (err) { 
      toast.error("Failed to load boards"); 
    }
  };

  const fetchBatches = async (branch_id: number) => {
    try {
      const data = await getBatches(branch_id);
      setBatches(data?.data || data || []);
    } catch (err) { 
      toast.error("Failed to load batches"); 
    }
  };

  const fetchStandards = async (board_id: number, batch_id: number, branch_id: number) => {
    try {
      const data = await getStandards(board_id, batch_id, branch_id);
      setStandards(data?.data || data || []);
    } catch (err) { 
      toast.error("Failed to load standards"); 
    }
  };

  const fetchSubjects = async (stand_id: number, branch_id: number, batch_id: number, board_id: number) => {
    try {
      const data = await getSubjects(stand_id, branch_id, batch_id, board_id);
      setSubjects(data?.data || data || []);
    } catch (err) { 
      toast.error("Failed to load subjects"); 
    }
  };

  const fetchChapters = async (sub_id: number, stand_id: number, branch_id: number, batch_id: number, board_id: number) => {
    try {
      const data = await getChapters(sub_id, stand_id, branch_id, batch_id, board_id);
      setChapters(data?.data || data || []);
    } catch (err) { 
      toast.error("Failed to load chapters"); 
    }
  };

  const fetchNotes = async (chap_id: number, sub_id: number, stand_id: number, branch_id: number, batch_id: number, board_id: number) => {
    setLoadingNotes(true);
    try {
      const data = await getNotes(chap_id, sub_id, stand_id, branch_id, batch_id, board_id);
      setNotes(data?.data || data || []);
    } catch (err) { 
      toast.error("Failed to load notes"); 
    } finally {
      setLoadingNotes(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadBranches();
    loadBoards();
  }, []);

  // --- Cascade Selection Handlers ---
  const handleBranchChange = (val: string) => {
    setSelectedBranchId(val);
    setSelectedBatchId("");
    setSelectedBoardId("");
    setSelectedStandardId("");
    setSelectedSubjectId("");
    setSelectedChapterId("");

    setBatches([]);
    setStandards([]);
    setSubjects([]);
    setChapters([]);
    setNotes([]);

    if (val) {
      fetchBatches(Number(val));
    }
  };

  const handleBatchChange = (val: string) => {
    setSelectedBatchId(val);
    setSelectedBoardId("");
    setSelectedStandardId("");
    setSelectedSubjectId("");
    setSelectedChapterId("");

    setStandards([]);
    setSubjects([]);
    setChapters([]);
    setNotes([]);
  };

  const handleBoardChange = (val: string) => {
    setSelectedBoardId(val);
    setSelectedStandardId("");
    setSelectedSubjectId("");
    setSelectedChapterId("");

    setStandards([]);
    setSubjects([]);
    setChapters([]);
    setNotes([]);

    if (val && selectedBatchId && selectedBranchId) {
      fetchStandards(Number(val), Number(selectedBatchId), Number(selectedBranchId));
    }
  };

  const handleStandardChange = (val: string) => {
    setSelectedStandardId(val);
    setSelectedSubjectId("");
    setSelectedChapterId("");

    setSubjects([]);
    setChapters([]);
    setNotes([]);

    if (val && selectedBranchId && selectedBatchId && selectedBoardId) {
      fetchSubjects(Number(val), Number(selectedBranchId), Number(selectedBatchId), Number(selectedBoardId));
    }
  };

  const handleSubjectChange = (val: string) => {
    setSelectedSubjectId(val);
    setSelectedChapterId("");

    setChapters([]);
    setNotes([]);

    if (val && selectedStandardId && selectedBranchId && selectedBatchId && selectedBoardId) {
      fetchChapters(Number(val), Number(selectedStandardId), Number(selectedBranchId), Number(selectedBatchId), Number(selectedBoardId));
    }
  };

  const handleChapterChange = (val: string) => {
    setSelectedChapterId(val);
    setNotes([]);

    if (val && selectedSubjectId && selectedStandardId && selectedBranchId && selectedBatchId && selectedBoardId) {
      fetchNotes(Number(val), Number(selectedSubjectId), Number(selectedStandardId), Number(selectedBranchId), Number(selectedBatchId), Number(selectedBoardId));
    }
  };

  const handleReset = () => {
    setSelectedBranchId("");
    setSelectedBatchId("");
    setSelectedBoardId("");
    setSelectedStandardId("");
    setSelectedSubjectId("");
    setSelectedChapterId("");

    setBatches([]);
    setStandards([]);
    setSubjects([]);
    setChapters([]);
    setNotes([]);
  };

  const handleSuccessAddition = (type: string) => {
    setOpen(false);
    
    // Refresh the corresponding lists based on what was added
    if (type === "branch") loadBranches();
    if (type === "board") loadBoards();
    if (type === "batch" && selectedBranchId) fetchBatches(Number(selectedBranchId));
    if (type === "standard" && selectedBoardId && selectedBatchId && selectedBranchId) {
      fetchStandards(Number(selectedBoardId), Number(selectedBatchId), Number(selectedBranchId));
    }
    if (type === "subject" && selectedStandardId && selectedBranchId && selectedBatchId && selectedBoardId) {
      fetchSubjects(Number(selectedStandardId), Number(selectedBranchId), Number(selectedBatchId), Number(selectedBoardId));
    }
    if (type === "chapter" && selectedSubjectId && selectedStandardId && selectedBranchId && selectedBatchId && selectedBoardId) {
      fetchChapters(Number(selectedSubjectId), Number(selectedStandardId), Number(selectedBranchId), Number(selectedBatchId), Number(selectedBoardId));
    }
    if (type === "note" && selectedChapterId && selectedSubjectId && selectedStandardId && selectedBranchId && selectedBatchId && selectedBoardId) {
      fetchNotes(Number(selectedChapterId), Number(selectedSubjectId), Number(selectedStandardId), Number(selectedBranchId), Number(selectedBatchId), Number(selectedBoardId));
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Browse & Manage Notes</h1>
          <p className="text-muted-foreground text-sm mt-1">Select filters to access chapters and notes files.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/teacherdashboard/notes">
            <Button variant="outline" size="sm" className="rounded-xl flex items-center gap-1.5 h-10">
              <ArrowLeft className="h-4 w-4" /> Switch to Wizard View
            </Button>
          </Link>
          <Button variant="ghost" size="icon" onClick={handleReset} title="Reset filters" className="rounded-xl h-10 w-10 border">
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Grid of Dropdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 bg-card p-6 rounded-2xl border border-border shadow-[var(--shadow-soft)]">
        {/* Branch Select */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Branch</label>
          <select
            className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
            value={selectedBranchId}
            onChange={(e) => handleBranchChange(e.target.value)}
          >
            <option value="">Select Branch</option>
            {branches.map((b) => (
              <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>
            ))}
          </select>
        </div>

        {/* Batch Select */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Batch</label>
          <select
            className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all disabled:opacity-50 disabled:bg-muted"
            value={selectedBatchId}
            onChange={(e) => handleBatchChange(e.target.value)}
            disabled={!selectedBranchId}
          >
            <option value="">Select Batch</option>
            {batches.map((b) => (
              <option key={b.batch_id} value={b.batch_id}>{b.batch_name}</option>
            ))}
          </select>
        </div>

        {/* Board Select */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Board</label>
          <select
            className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all disabled:opacity-50 disabled:bg-muted"
            value={selectedBoardId}
            onChange={(e) => handleBoardChange(e.target.value)}
            disabled={!selectedBatchId}
          >
            <option value="">Select Board</option>
            {boards.map((b) => (
              <option key={b.board_id} value={b.board_id}>{b.name}</option>
            ))}
          </select>
        </div>

        {/* Standard Select */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Standard</label>
          <select
            className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all disabled:opacity-50 disabled:bg-muted"
            value={selectedStandardId}
            onChange={(e) => handleStandardChange(e.target.value)}
            disabled={!selectedBoardId}
          >
            <option value="">Select Standard</option>
            {standards.map((s) => (
              <option key={s.stand_id} value={s.stand_id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Subject Select */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subject</label>
          <select
            className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all disabled:opacity-50 disabled:bg-muted"
            value={selectedSubjectId}
            onChange={(e) => handleSubjectChange(e.target.value)}
            disabled={!selectedStandardId}
          >
            <option value="">Select Subject</option>
            {subjects.map((s) => (
              <option key={s.sub_id} value={s.sub_id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Chapter Select */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Chapter</label>
          <select
            className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all disabled:opacity-50 disabled:bg-muted"
            value={selectedChapterId}
            onChange={(e) => handleChapterChange(e.target.value)}
            disabled={!selectedSubjectId}
          >
            <option value="">Select Chapter</option>
            {chapters.map((c) => (
              <option key={c.chap_id} value={c.chap_id}>{c.name || c.chapter_name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Results Display */}
      <div className="space-y-6">
        {selectedChapter ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chapter details & topics */}
            <div className="lg:col-span-1 bg-card border border-border p-6 rounded-2xl space-y-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full">Chapter Details</span>
                <h3 className="text-xl font-bold mt-2.5 text-foreground">{selectedChapter.name || selectedChapter.chapter_name}</h3>
                {selectedChapter.description && (
                  <p className="text-muted-foreground text-xs mt-1.5 leading-relaxed">{selectedChapter.description}</p>
                )}
              </div>

              {/* Topics */}
              <div className="space-y-2.5 pt-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Topics covered</h4>
                <div className="border-l-2 border-primary/20 pl-4 space-y-2">
                  {selectedChapter?.topics && selectedChapter.topics.length > 0 ? (
                    selectedChapter.topics.map((topic: any, idx: number) => (
                      <div key={idx} className="bg-muted/40 p-3 rounded-xl flex justify-between items-center">
                        <div>
                          <p className="text-xs font-semibold text-foreground">{topic.name}</p>
                          { (topic.start_date || topic.end_date) && (
                            <p className="text-[9px] text-muted-foreground mt-0.5">
                              {topic.start_date ? new Date(topic.start_date).toLocaleDateString() : 'N/A'} 
                              {" — "} 
                              {topic.end_date ? new Date(topic.end_date).toLocaleDateString() : 'N/A'}
                            </p>
                          )}
                        </div>
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic pl-2">No topics defined for this chapter.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Notes List */}
            <div className="lg:col-span-2 space-y-3">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                Notes for Chapter
                {loadingNotes && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
              </h3>
              
              {notes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
                  <p className="text-muted-foreground">No notes available for this chapter.</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">Click the "Manage" button below to add note PDF files.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notes.map((n) => (
                    <div 
                      key={n.note_id}
                      onClick={() => window.open(n.file_url, "_blank")}
                      className="w-full flex items-center justify-between rounded-2xl bg-card border border-border px-5 py-4 text-left hover:border-primary hover:shadow-[var(--shadow-soft)] transition-all cursor-pointer"
                    >
                      <div>
                        <div className="font-semibold text-foreground">{n.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">PDF Document File</div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground ml-4" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center max-w-lg mx-auto">
            <p className="text-muted-foreground font-medium">No chapter selected</p>
            <p className="text-sm text-muted-foreground/75 mt-1.5 max-w-sm mx-auto">
              Please choose a Branch, Batch, Board, Standard, Subject, and Chapter to display notes and topics.
            </p>
          </div>
        )}
      </div>

      {/* Floating Manage button */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            className="fixed bottom-8 right-8 inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-primary-foreground font-medium shadow-[var(--shadow-elegant)] hover:scale-[1.02] active:scale-[0.98] transition-transform z-50"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Plus className="h-5 w-5" /> Manage
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[95vh] overflow-y-auto">
          <SheetHeader className="text-left">
            <SheetTitle>Manage Categories & Notes</SheetTitle>
          </SheetHeader>
          
          <DropdownManageForm 
            onSuccess={handleSuccessAddition}
            initialValues={{
              branchId: selectedBranchId,
              batchId: selectedBatchId,
              boardId: selectedBoardId,
              standardId: selectedStandardId,
              subjectId: selectedSubjectId,
              chapterId: selectedChapterId
            }}
            dropdowns={{
              branches,
              batches,
              boards,
              standards,
              subjects,
              chapters
            }}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ── DropdownManageForm Subcomponent ──
function DropdownManageForm({
  onSuccess,
  initialValues,
  dropdowns
}: {
  onSuccess: (type: string) => void;
  initialValues: {
    branchId: string;
    batchId: string;
    boardId: string;
    standardId: string;
    subjectId: string;
    chapterId: string;
  };
  dropdowns: {
    branches: any[];
    batches: any[];
    boards: any[];
    standards: any[];
    subjects: any[];
    chapters: any[];
  }
}) {
  const [loading, setLoading] = useState(false);
  const [addType, setAddType] = useState<"branch" | "batch" | "board" | "standard" | "subject" | "chapter" | "note">("branch");

  // Form selections / parents
  const [formBranchId, setFormBranchId] = useState(initialValues.branchId);
  const [formBatchId, setFormBatchId] = useState(initialValues.batchId);
  const [formBoardId, setFormBoardId] = useState(initialValues.boardId);
  const [formStandardId, setFormStandardId] = useState(initialValues.standardId);
  const [formSubjectId, setFormSubjectId] = useState(initialValues.subjectId);
  const [formChapterId, setFormChapterId] = useState(initialValues.chapterId);

  // Field values
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [title, setTitle] = useState("");
  const [fileUrl, setFileUrl] = useState("");

  // Batch specific fields
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Subject specific fields
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");

  // Chapter specific dynamic topics
  const [topics, setTopics] = useState<any[]>([
    { topic_name: "", start_date: "", end_date: "" }
  ]);

  // Load teachers for Subject addition
  useEffect(() => {
    if (addType === "subject") {
      const loadTeachers = async () => {
        try {
          const res = await getTeachers();
          setTeachers(res.data || []);
        } catch (err) {
          toast.error("Failed to load teachers");
        }
      };
      loadTeachers();
    }
  }, [addType]);

  // Reset fields on type change
  useEffect(() => {
    setName("");
    setDescription("");
    setTitle("");
    setFileUrl("");
    setStartTime("");
    setEndTime("");
    setStartDate("");
    setEndDate("");
    setSelectedTeacherId("");
    setTopics([{ topic_name: "", start_date: "", end_date: "" }]);
  }, [addType]);

  // Sync parent selections when initial values change
  useEffect(() => {
    setFormBranchId(initialValues.branchId);
    setFormBatchId(initialValues.batchId);
    setFormBoardId(initialValues.boardId);
    setFormStandardId(initialValues.standardId);
    setFormSubjectId(initialValues.subjectId);
    setFormChapterId(initialValues.chapterId);
  }, [initialValues]);

  const addTopicField = () => {
    setTopics([...topics, { topic_name: "", start_date: "", end_date: "" }]);
  };

  const updateTopic = (index: number, field: string, value: string) => {
    const newTopics = [...topics];
    newTopics[index][field] = value;
    setTopics(newTopics);
  };

  const removeTopic = (index: number) => {
    setTopics(topics.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let endpoint = "";
      let payload: any = {};

      if (addType === "branch") {
        if (!name) return toast.error("Branch name is required");
        endpoint = "/branches/";
        payload = { branch_name: name };
      } 
      else if (addType === "batch") {
        if (!formBranchId) return toast.error("Please select a Branch first");
        if (!name || !startTime || !endTime || !startDate || !endDate) {
          return toast.error("All batch fields are required");
        }
        endpoint = "/batches/";
        payload = {
          branch_id: Number(formBranchId),
          batch_name: name,
          start_time: startTime,
          end_time: endTime,
          batch_start_date: startDate,
          batch_end_date: endDate
        };
      } 
      else if (addType === "board") {
        if (!name) return toast.error("Board name is required");
        endpoint = "/boards/";
        payload = { name };
      } 
      else if (addType === "standard") {
        if (!formBoardId || !formBatchId) return toast.error("Please select Board and Batch first");
        if (!name) return toast.error("Standard name is required");
        endpoint = "/standards/";
        payload = {
          board_id: Number(formBoardId),
          batch_id: Number(formBatchId),
          name
        };
      } 
      else if (addType === "subject") {
        if (!formStandardId) return toast.error("Please select a Standard first");
        if (!name) return toast.error("Subject name is required");
        endpoint = "/subjects/";
        payload = {
          stand_id: Number(formStandardId),
          name,
          teacher_id: selectedTeacherId || null
        };
      } 
      else if (addType === "chapter") {
        if (!formSubjectId) return toast.error("Please select a Subject first");
        if (!name || !description) return toast.error("Name and Description are required");
        
        const validTopics = topics.filter(t => t.topic_name.trim() !== "");
        endpoint = "/chapters/";
        payload = {
          sub_id: Number(formSubjectId),
          name,
          description,
          topics: validTopics
        };
      } 
      else if (addType === "note") {
        if (!formChapterId) return toast.error("Please select a Chapter first");
        if (!title || !fileUrl) return toast.error("Title and File URL are required");
        endpoint = "/notes/";
        payload = {
          chap_id: Number(formChapterId),
          title,
          file_url: fileUrl
        };
      }

      const res = await createCategories(endpoint, payload);
      if (!res?.message && !res?.success) throw new Error("Creation failed");

      toast.success(res?.message || "Created successfully");
      
      // Reset form fields
      setName("");
      setDescription("");
      setTitle("");
      setFileUrl("");
      setStartTime("");
      setEndTime("");
      setStartDate("");
      setEndDate("");
      setTopics([{ topic_name: "", start_date: "", end_date: "" }]);

      onSuccess(addType);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save entry");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-6 max-w-xl">
      {/* Select type to add */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase text-muted-foreground">What would you like to add?</label>
        <select
          className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all font-semibold"
          value={addType}
          onChange={(e) => setAddType(e.target.value as any)}
          disabled={loading}
        >
          <option value="branch">Branch</option>
          <option value="batch">Batch</option>
          <option value="board">Board</option>
          <option value="standard">Standard</option>
          <option value="subject">Subject</option>
          <option value="chapter">Chapter</option>
          <option value="note">Note File (PDF)</option>
        </select>
      </div>

      {/* Conditionally rendered parent filters in form */}
      
      {addType === "batch" && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase text-muted-foreground">Parent Branch</label>
          <select
            className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
            value={formBranchId}
            onChange={(e) => setFormBranchId(e.target.value)}
            disabled={loading}
          >
            <option value="">Select Branch</option>
            {dropdowns.branches.map((b) => (
              <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>
            ))}
          </select>
        </div>
      )}

      {addType === "standard" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Parent Board</label>
            <select
              className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
              value={formBoardId}
              onChange={(e) => setFormBoardId(e.target.value)}
              disabled={loading}
            >
              <option value="">Select Board</option>
              {dropdowns.boards.map((b) => (
                <option key={b.board_id} value={b.board_id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Parent Batch</label>
            <select
              className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
              value={formBatchId}
              onChange={(e) => setFormBatchId(e.target.value)}
              disabled={loading}
            >
              <option value="">Select Batch</option>
              {dropdowns.batches.map((b) => (
                <option key={b.batch_id} value={b.batch_id}>{b.batch_name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {addType === "subject" && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase text-muted-foreground">Parent Standard</label>
          <select
            className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
            value={formStandardId}
            onChange={(e) => setFormStandardId(e.target.value)}
            disabled={loading}
          >
            <option value="">Select Standard</option>
            {dropdowns.standards.map((s) => (
              <option key={s.stand_id} value={s.stand_id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      {addType === "chapter" && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase text-muted-foreground">Parent Subject</label>
          <select
            className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
            value={formSubjectId}
            onChange={(e) => setFormSubjectId(e.target.value)}
            disabled={loading}
          >
            <option value="">Select Subject</option>
            {dropdowns.subjects.map((s) => (
              <option key={s.sub_id} value={s.sub_id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      {addType === "note" && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase text-muted-foreground">Parent Chapter</label>
          <select
            className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
            value={formChapterId}
            onChange={(e) => setFormChapterId(e.target.value)}
            disabled={loading}
          >
            <option value="">Select Chapter</option>
            {dropdowns.chapters.map((c) => (
              <option key={c.chap_id} value={c.chap_id}>{c.name || c.chapter_name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Conditionally rendered fields based on what is being added */}
      
      {addType !== "note" && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase text-muted-foreground">Name</label>
          <Input
            placeholder={
              addType === "branch" ? "e.g. Chinchwad" :
              addType === "batch" ? "e.g. Morning Batch" :
              addType === "board" ? "e.g. CBSE" :
              addType === "standard" ? "e.g. 10th Standard" :
              addType === "subject" ? "e.g. Physics" : "e.g. Laws of Motion"
            }
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
          />
        </div>
      )}

      {addType === "batch" && (
        <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Start Time</label>
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={loading} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">End Time</label>
            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={loading} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Start Date</label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={loading} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">End Date</label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={loading} />
          </div>
        </div>
      )}

      {addType === "subject" && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase text-muted-foreground">Assign Teacher (Optional)</label>
          <select 
            className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
            value={selectedTeacherId}
            onChange={(e) => setSelectedTeacherId(e.target.value)}
            disabled={loading}
          >
            <option value="">Select a Teacher</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      )}

      {addType === "chapter" && (
        <div className="space-y-4 bg-muted/10 p-4 rounded-xl border">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Chapter Description</label>
            <Textarea
              placeholder="Provide a brief summary of the chapter..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
            />
          </div>
          
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-muted-foreground">Chapter Topics</h4>
              <Button type="button" variant="outline" size="sm" onClick={addTopicField} className="h-8 rounded-lg">
                <Plus className="h-3 w-3 mr-1" /> Add Topic
              </Button>
            </div>
            
            {topics.map((topic, index) => (
              <div key={index} className="p-3 border rounded-xl bg-card space-y-2 relative shadow-sm">
                <Input 
                  placeholder="Topic Title (e.g. Newton's First Law)" 
                  value={topic.topic_name} 
                  onChange={(e) => updateTopic(index, "topic_name", e.target.value)}
                  disabled={loading}
                />
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">Start Date</label>
                    <Input type="date" value={topic.start_date} onChange={(e) => updateTopic(index, "start_date", e.target.value)} disabled={loading} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">End Date</label>
                    <Input type="date" value={topic.end_date} onChange={(e) => updateTopic(index, "end_date", e.target.value)} disabled={loading} />
                  </div>
                </div>
                {topics.length > 1 && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className="text-destructive h-6 absolute top-1 right-1 hover:bg-destructive/10" 
                    onClick={() => removeTopic(index)}
                    disabled={loading}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {addType === "note" && (
        <div className="space-y-3 bg-muted/20 p-4 rounded-xl border">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Note Title</label>
            <Input 
              placeholder="e.g. Laws of Motion Revision PDF" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              disabled={loading} 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase text-muted-foreground">File URL</label>
            <Input 
              placeholder="e.g. https://domain.com/notes.pdf" 
              value={fileUrl} 
              onChange={(e) => setFileUrl(e.target.value)} 
              disabled={loading} 
            />
          </div>
        </div>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-12 rounded-xl text-base mt-2"
        style={{ background: "var(--gradient-primary)" }}
      >
        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
        {loading ? "Saving Entry..." : `Add ${addType.charAt(0).toUpperCase() + addType.slice(1)}`}
      </Button>
    </form>
  );
}
