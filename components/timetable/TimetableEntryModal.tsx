import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TimetableConfig, TimetableEntry } from "./TimetableCalendar";

interface TimetableEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date | null;
  config: TimetableConfig | null;
  entry: TimetableEntry | null;
  onSaveEntry: (data: Partial<TimetableEntry>) => void;
  onDeleteEntry: () => void;
  // Header config mode props
  isHeaderMode?: boolean;
  dayOfWeek?: number;
  onSaveConfig?: (data: Partial<TimetableConfig>) => void;
}

export function TimetableEntryModal({
  isOpen, onClose, date, config, entry,
  onSaveEntry, onDeleteEntry,
  isHeaderMode = false, dayOfWeek, onSaveConfig
}: TimetableEntryModalProps) {
  
  const [topic, setTopic] = useState("");
  const [entryType, setEntryType] = useState<"class"|"test"|"holiday"|"off">("class");
  const [testSubject, setTestSubject] = useState("");
  const [note, setNote] = useState("");
  const [colorOverride, setColorOverride] = useState("");

  // Header state
  const [subject, setSubject] = useState("");
  const [colorCode, setColorCode] = useState("#FFFFFF");

  useEffect(() => {
    if (isOpen) {
      if (isHeaderMode) {
        setSubject(config?.subject || "");
        setColorCode(config?.color_code || "#FFFFFF");
      } else {
        setTopic(entry?.topic || "");
        setEntryType(entry?.entry_type || (config?.subject?.toLowerCase().includes("off") ? "off" : "class"));
        setTestSubject(entry?.test_subject || config?.subject || "");
        setNote(entry?.note || "");
        setColorOverride(entry?.color_override || "");
      }
    }
  }, [isOpen, isHeaderMode, config, entry]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (isHeaderMode && onSaveConfig) {
      onSaveConfig({
        subject,
        color_code: colorCode,
        day_of_week: dayOfWeek
      });
    } else {
      if (date) {
        // Fix for date parsing local timezone issue
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        onSaveEntry({
          entry_date: d.toISOString().split('T')[0],
          topic,
          entry_type: entryType,
          test_subject: entryType === "test" ? testSubject : "",
          note,
          color_override: colorOverride || null
        });
      }
    }
    onClose();
  };

  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const PRESET_COLORS = [
    { label: "White (Default)", value: "#FFFFFF" },
    { label: "Soft Green (Bio)", value: "#E8F5E9" },
    { label: "Soft Yellow (Phy)", value: "#FFF9C4" },
    { label: "Soft Blue (Hindi)", value: "#E3F2FD" },
    { label: "Soft Pink (Chem)", value: "#FCE4EC" },
    { label: "Soft Purple (Math)", value: "#F3E5F5" },
    { label: "Light Grey (Off)", value: "#ECEFF1" },
    { label: "Soft Orange (Test)", value: "#FFF3E0" },
    { label: "Light Red (Holiday)", value: "#FFCDD2" }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-semibold text-slate-800">
            {isHeaderMode 
              ? `Configure Every ${dayOfWeek !== undefined ? DAYS[dayOfWeek] : ""}` 
              : `Edit ${date?.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}`}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {isHeaderMode ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Subject / Label</label>
                <Input 
                  placeholder="e.g., Bio, Phy, W. Off" 
                  value={subject} 
                  onChange={e => setSubject(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Column Background Color</label>
                <div className="grid grid-cols-5 gap-2 mb-2">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c.value}
                      title={c.label}
                      type="button"
                      onClick={() => setColorCode(c.value)}
                      className={`h-8 rounded border transition-all ${colorCode === c.value ? 'ring-2 ring-primary ring-offset-1 border-transparent' : 'border-slate-200 hover:scale-105'}`}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                </div>
                <Input type="color" value={colorCode} onChange={e => setColorCode(e.target.value)} className="h-10" />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Entry Type</label>
                <Select value={entryType} onValueChange={(v: any) => setEntryType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="class">Regular Class</SelectItem>
                    <SelectItem value="test">Weekly Test</SelectItem>
                    <SelectItem value="holiday">Holiday</SelectItem>
                    <SelectItem value="off">Weekly Off</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {entryType === "class" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Topic</label>
                  <Input 
                    placeholder="e.g., TISSUES, Gravitation" 
                    value={topic} 
                    onChange={e => setTopic(e.target.value)} 
                  />
                </div>
              )}

              {entryType === "test" && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Test Subject</label>
                    <Input 
                      placeholder="e.g., Bio, Chem" 
                      value={testSubject} 
                      onChange={e => setTestSubject(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Syllabus / Topic</label>
                    <Input 
                      placeholder="e.g., Circles, Surface Area" 
                      value={topic} 
                      onChange={e => setTopic(e.target.value)} 
                    />
                  </div>
                </>
              )}

              {entryType === "holiday" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Holiday Name</label>
                  <Input 
                    placeholder="e.g., Independence Day" 
                    value={topic} 
                    onChange={e => setTopic(e.target.value)} 
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Notes / Marking Scheme (Optional)</label>
                <Textarea 
                  placeholder="e.g., Marking Scheme: +4 for correct, -1 for wrong"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="resize-none"
                  rows={3}
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-sm font-medium text-slate-700">Custom Color Override (Optional)</label>
                <div className="flex gap-2">
                  <Input 
                    type="color" 
                    value={colorOverride || "#ffffff"} 
                    onChange={e => setColorOverride(e.target.value)} 
                    className="w-16 h-10 p-1" 
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setColorOverride("")}
                  >
                    Clear Override
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between">
          {!isHeaderMode && entry?.id ? (
            <Button variant="destructive" onClick={() => { onDeleteEntry(); onClose(); }}>
              Delete
            </Button>
          ) : (
            <div></div> // spacer
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} className="bg-primary text-white">Save Changes</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
