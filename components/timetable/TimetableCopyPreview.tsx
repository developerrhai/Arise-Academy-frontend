import React, { useState } from "react";
import { Copy, AlertTriangle, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { timetableApi } from "@/lib/api";

interface TimetableCopyPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  batch: string;
  targetYear: number;
  targetMonth: number;
  onSuccess: () => void;
}

export function TimetableCopyPreview({
  isOpen, onClose, batch, targetYear, targetMonth, onSuccess
}: TimetableCopyPreviewProps) {
  
  const [sourceMonth, setSourceMonth] = useState(targetMonth === 1 ? 12 : targetMonth - 1);
  const [sourceYear, setSourceYear] = useState(targetMonth === 1 ? targetYear - 1 : targetYear);
  const [loading, setLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState("");

  if (!isOpen) return null;

  const handleCopy = async () => {
    setLoading(true);
    setResultMessage("");
    try {
      const res = await timetableApi.copyMonth({
        batch,
        sourceMonth,
        sourceYear,
        targetMonth,
        targetYear
      });
      if (res.success) {
        setResultMessage(res.message);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      }
    } catch (err: any) {
      setResultMessage(err.message || "Failed to copy month data");
    } finally {
      setLoading(false);
    }
  };

  const getMonthName = (m: number) => {
    const d = new Date();
    d.setMonth(m - 1);
    return d.toLocaleString('default', { month: 'long' });
  };

  const currentMonthOptions = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-primary/10 rounded-full text-primary">
            <Copy className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Copy Previous Month</h2>
            <p className="text-sm text-slate-500">Duplicate the syllabus structure</p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg text-sm mb-6 flex gap-2 items-start">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>
            This will copy the day-of-week subject mapping and regular classes/tests to the target month.
            <strong> Holidays will be skipped.</strong>
          </p>
        </div>

        <div className="flex items-center justify-between mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Copy From</label>
            <Select value={sourceMonth.toString()} onValueChange={v => setSourceMonth(parseInt(v))}>
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currentMonthOptions.map(m => (
                  <SelectItem key={m} value={m.toString()}>{getMonthName(m)} {sourceYear}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="px-4 text-slate-400">
            <ArrowRight className="w-5 h-5" />
          </div>

          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Target Month</label>
            <div className="p-2 border rounded-md bg-slate-100 text-slate-700 font-medium text-sm text-center">
              {getMonthName(targetMonth)} {targetYear}
            </div>
          </div>
        </div>

        {resultMessage && (
          <div className={`p-3 rounded-lg text-sm font-medium flex items-center gap-2 mb-4 ${
            resultMessage.includes("Failed") ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
          }`}>
            {!resultMessage.includes("Failed") && <Check className="w-4 h-4" />}
            {resultMessage}
          </div>
        )}

        <div className="flex gap-3 justify-end mt-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleCopy} disabled={loading} className="bg-primary text-white">
            {loading ? "Copying..." : "Confirm Copy"}
          </Button>
        </div>
      </div>
    </div>
  );
}
