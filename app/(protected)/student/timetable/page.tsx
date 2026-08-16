"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimetableCalendar, TimetableConfig, TimetableEntry } from "@/components/timetable/TimetableCalendar";
import { timetableApi } from "@/lib/api";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/store";

export default function StudentTimetablePage() {
  // Student's batch is typically defined by standard and course/board
  const user = useAuthStore(state => state.user);
  
  // Construct the batch string based on student profile (e.g., "Class 10 Batch A")
  const studentBatch = user ? `${(user as any).standard || ''} ${(user as any).course || ''}`.trim() : "";
  
  const currentDate = new Date();
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth() + 1);

  const [configs, setConfigs] = useState<TimetableConfig[]>([]);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (studentBatch) {
      fetchTimetable();
    } else {
      setLoading(false);
    }
  }, [studentBatch, year, month]);

  const fetchTimetable = async () => {
    setLoading(true);
    try {
      const res = await timetableApi.viewMonth(studentBatch, year, month);
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

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-primary" />
            My Timetable
          </h1>
          <p className="text-muted-foreground mt-1">Syllabus, tests, and holidays for {studentBatch || "your batch"}.</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-[var(--shadow-elegant)] border border-slate-200">
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
        ) : !studentBatch ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500">
            <p>Your batch is not fully configured. Please contact the admin.</p>
          </div>
        ) : (
          <div className="overflow-x-auto pb-4">
            <div className="min-w-[800px]">
              <TimetableCalendar 
                year={year} 
                month={month} 
                configs={configs} 
                entries={entries} 
                editable={false} // View Only
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
