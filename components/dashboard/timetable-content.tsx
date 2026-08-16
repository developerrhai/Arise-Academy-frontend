import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Copy, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TimetableCalendar, TimetableConfig, TimetableEntry } from "../timetable/TimetableCalendar";
import { TimetableEntryModal } from "../timetable/TimetableEntryModal";
import { TimetableCopyPreview } from "../timetable/TimetableCopyPreview";
import { timetableApi } from "@/lib/api";
import { toast } from "sonner";

export function TimetableContent() {
  const [batches, setBatches] = useState<string[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>("");
  
  const currentDate = new Date();
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth() + 1);

  const [configs, setConfigs] = useState<TimetableConfig[]>([]);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  
  const [modalDate, setModalDate] = useState<Date | null>(null);
  const [modalConfig, setModalConfig] = useState<TimetableConfig | null>(null);
  const [modalEntry, setModalEntry] = useState<TimetableEntry | null>(null);
  
  const [isHeaderMode, setIsHeaderMode] = useState(false);
  const [headerDayOfWeek, setHeaderDayOfWeek] = useState<number | undefined>();

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    if (selectedBatch) {
      fetchTimetable();
    } else {
      setConfigs([]);
      setEntries([]);
      setLoading(false);
    }
  }, [selectedBatch, year, month]);

  const fetchBatches = async () => {
    try {
      const res = await timetableApi.getBatches();
      if (res.success && res.data.length > 0) {
        setBatches(res.data);
        setSelectedBatch(res.data[0]);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch batches");
      setLoading(false);
    }
  };

  const fetchTimetable = async () => {
    setLoading(true);
    try {
      const res = await timetableApi.getMonth(selectedBatch, year, month);
      if (res.success) {
        setConfigs(res.data.config || []);
        setEntries(res.data.entries || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch timetable");
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(y => y - 1);
    } else {
      setMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(y => y + 1);
    } else {
      setMonth(m => m + 1);
    }
  };

  const handleCellClick = (date: Date, config: TimetableConfig | undefined, entry: TimetableEntry | undefined) => {
    setModalDate(date);
    setModalConfig(config || null);
    setModalEntry(entry || null);
    setIsHeaderMode(false);
    setHeaderDayOfWeek(undefined);
    setIsEntryModalOpen(true);
  };

  const handleHeaderClick = (dayOfWeek: number, config: TimetableConfig | undefined) => {
    setModalDate(null);
    setModalConfig(config || null);
    setModalEntry(null);
    setIsHeaderMode(true);
    setHeaderDayOfWeek(dayOfWeek);
    setIsEntryModalOpen(true);
  };

  const handleSaveEntry = async (data: Partial<TimetableEntry>) => {
    try {
      if (modalEntry?.id) {
        const res = await timetableApi.updateEntry(modalEntry.id, { ...data, batch: selectedBatch });
        if (res.success) toast.success("Entry updated");
      } else {
        const res = await timetableApi.saveEntry({ ...data, batch: selectedBatch });
        if (res.success) toast.success("Entry created");
      }
      fetchTimetable();
    } catch (err: any) {
      toast.error(err.message || "Failed to save entry");
    }
  };

  const handleDeleteEntry = async () => {
    if (modalEntry?.id) {
      try {
        const res = await timetableApi.deleteEntry(modalEntry.id);
        if (res.success) toast.success("Entry deleted");
        fetchTimetable();
      } catch (err: any) {
        toast.error(err.message || "Failed to delete entry");
      }
    }
  };

  const handleSaveConfig = async (data: Partial<TimetableConfig>) => {
    try {
      const res = await timetableApi.saveConfig({ ...data, batch: selectedBatch, month, year });
      if (res.success) toast.success("Column configuration saved");
      fetchTimetable();
    } catch (err: any) {
      toast.error(err.message || "Failed to save configuration");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Timetable Calendar</h2>
          <p className="text-slate-500 text-sm mt-1">Manage syllabus, tests, and holidays visually</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedBatch} onValueChange={setSelectedBatch}>
            <SelectTrigger className="w-[200px] bg-white">
              <SelectValue placeholder="Select Batch" />
            </SelectTrigger>
            <SelectContent>
              {batches.map(b => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            className="flex items-center gap-2 bg-white"
            onClick={() => setIsCopyModalOpen(true)}
            disabled={!selectedBatch}
          >
            <Copy className="w-4 h-4" />
            Copy from Previous Month
          </Button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-6">
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="text-xl font-bold text-slate-800">
            {new Date(year, month - 1).toLocaleString('default', { month: 'long' })} {year}
          </div>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : !selectedBatch ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500">
            <p>Please select or create a batch to manage timetable</p>
          </div>
        ) : (
          <TimetableCalendar 
            year={year} 
            month={month} 
            configs={configs} 
            entries={entries} 
            editable={true}
            onCellClick={handleCellClick}
            onHeaderClick={handleHeaderClick}
          />
        )}
      </div>

      <TimetableEntryModal
        isOpen={isEntryModalOpen}
        onClose={() => setIsEntryModalOpen(false)}
        date={modalDate}
        config={modalConfig}
        entry={modalEntry}
        onSaveEntry={handleSaveEntry}
        onDeleteEntry={handleDeleteEntry}
        isHeaderMode={isHeaderMode}
        dayOfWeek={headerDayOfWeek}
        onSaveConfig={handleSaveConfig}
      />

      <TimetableCopyPreview
        isOpen={isCopyModalOpen}
        onClose={() => setIsCopyModalOpen(false)}
        batch={selectedBatch}
        targetYear={year}
        targetMonth={month}
        onSuccess={fetchTimetable}
      />
    </div>
  );
}
