"use client";

import React, { useState, useMemo } from "react";
import { Flag, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";
export interface TimetableConfig {
  id?: number;
  day_of_week: number;
  subject: string;
  color_code: string;
}

export interface TimetableEntry {
  id?: number;
  entry_date: string;
  subject: string;
  topic: string;
  entry_type: "class" | "test" | "holiday" | "off";
  test_subject: string;
  note: string;
  color_override: string | null;
}

interface TimetableCalendarProps {
  year: number;
  month: number;
  configs: TimetableConfig[];
  entries: TimetableEntry[];
  editable?: boolean;
  onCellClick?: (date: Date, config: TimetableConfig | undefined, entry: TimetableEntry | undefined) => void;
  onHeaderClick?: (dayOfWeek: number, currentConfig: TimetableConfig | undefined) => void;
}

export function TimetableCalendar({
  year,
  month,
  configs,
  entries,
  editable = false,
  onCellClick,
  onHeaderClick
}: TimetableCalendarProps) {
  
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay(); // 0 (Sun) to 6 (Sat)
  
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getConfig = (dayIndex: number) => 
    configs.find(c => c.day_of_week === dayIndex) || { day_of_week: dayIndex, subject: "", color_code: "#FFFFFF" };

  const getEntry = (dateNum: number) => {
    const dStr = new Date(Date.UTC(year, month - 1, dateNum)).toISOString().split('T')[0];
    return entries.find(e => e.entry_date.startsWith(dStr));
  };

  const gridCells = [];
  // Empty slots before 1st day
  for (let i = 0; i < firstDayOfMonth; i++) {
    gridCells.push(<div key={`empty-${i}`} className="bg-slate-50/50 border-r border-b border-slate-200 min-h-[120px]" />);
  }

  // Actual days
  for (let day = 1; day <= daysInMonth; day++) {
    const currentDayOfWeek = (firstDayOfMonth + day - 1) % 7;
    const config = getConfig(currentDayOfWeek);
    const entry = getEntry(day);

    let bgColor = config.color_code || "#FFFFFF";
    let isHoliday = false;
    let isTest = false;
    let isOff = false;
    
    if (entry) {
      if (entry.color_override) bgColor = entry.color_override;
      isHoliday = entry.entry_type === "holiday";
      isTest = entry.entry_type === "test";
      isOff = entry.entry_type === "off";
      
      // Override default behaviors based on entry type
      if (isTest && !entry.color_override) bgColor = "#FFF3E0"; // Default test color
      if (isHoliday && !entry.color_override) bgColor = "#FFCDD2"; // Default holiday color
      if (isOff && !entry.color_override) bgColor = "#ECEFF1"; // Default off color
    } else {
      // Auto weekly off if subject implies it
      if (config.subject.toLowerCase().includes("off")) {
        isOff = true;
        bgColor = "#ECEFF1";
      }
    }

    gridCells.push(
      <div 
        key={`day-${day}`}
        onClick={() => editable && onCellClick && onCellClick(new Date(year, month - 1, day), config, entry)}
        className={cn(
          "relative border-r border-b border-slate-200 p-2 min-h-[120px] transition-all flex flex-col group",
          editable && "cursor-pointer hover:shadow-md hover:z-10",
          !entry && !isOff && !isHoliday && editable && "hover:bg-slate-100"
        )}
        style={{ backgroundColor: bgColor }}
      >
        <span className="font-bold text-slate-700 text-lg">{day}</span>
        
        {editable && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Edit2 className="w-4 h-4 text-slate-400 hover:text-slate-700" />
          </div>
        )}

        <div className="mt-2 flex-1 flex flex-col gap-1">
          {isHoliday ? (
            <div className="flex-1 flex flex-col items-center justify-center text-red-700 text-center">
              <Flag className="w-6 h-6 mb-1 text-red-600" />
              <span className="font-bold text-sm leading-tight">{entry?.topic || "Holiday"}</span>
            </div>
          ) : isTest ? (
            <div className="flex-1 flex flex-col items-center text-orange-800 text-center">
              <div className="text-xs font-semibold uppercase tracking-wider mb-1">Weekly Test</div>
              <div className="text-sm font-bold bg-orange-100/50 px-2 py-0.5 rounded w-full">({entry?.test_subject || config.subject})</div>
              <div className="text-sm font-medium mt-1 leading-tight">{entry?.topic}</div>
            </div>
          ) : isOff ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 italic text-sm font-medium">
              Weekly Off
            </div>
          ) : entry?.topic ? (
            <div className="flex-1 flex flex-col items-center text-center">
              <span className="font-bold text-sm text-slate-800 leading-tight uppercase tracking-wide">
                {entry.topic}
              </span>
              {entry.note && (
                <span className="text-[10px] text-slate-600 mt-2 p-1 bg-white/50 rounded leading-tight w-full shadow-sm">
                  {entry.note}
                </span>
              )}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  // Fill remaining cells for grid balance
  const totalCells = gridCells.length;
  const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let i = 0; i < remaining; i++) {
    gridCells.push(<div key={`end-${i}`} className="bg-slate-50/50 border-r border-b border-slate-200 min-h-[120px]" />);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header Row */}
      <div className="grid grid-cols-7 border-b-2 border-slate-300">
        {DAYS.map((dayName, idx) => {
          const config = getConfig(idx);
          const hasSubject = config.subject && config.subject.trim() !== "";
          
          return (
            <div 
              key={dayName}
              onClick={() => editable && onHeaderClick && onHeaderClick(idx, config)}
              className={cn(
                "p-3 text-center border-r border-slate-200 relative group flex flex-col items-center justify-center min-h-[80px]",
                editable && "cursor-pointer hover:bg-slate-50"
              )}
              style={{ backgroundColor: config.color_code && config.color_code !== '#FFFFFF' ? config.color_code : 'transparent' }}
            >
              <div className="font-bold text-slate-800 text-sm lg:text-base uppercase tracking-wider">{dayName}</div>
              {hasSubject && (
                <div className="text-xs lg:text-sm font-semibold text-slate-600 mt-1">({config.subject})</div>
              )}
              {editable && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7">
        {gridCells}
      </div>
    </div>
  );
}
