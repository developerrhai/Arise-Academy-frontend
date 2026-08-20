"use client";

import { useState, useRef } from "react";
import { getSocket } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { SendHorizontal, Paperclip, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import imageCompression from "browser-image-compression";

export function ChatInput({ groupId }: { groupId: number }) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      // Append new files up to 10 max
      const newFiles = Array.from(e.target.files);
      setFiles(prev => {
        const combined = [...prev, ...newFiles];
        if (combined.length > 10) {
          toast.error("Maximum 10 files can be sent at once");
          return combined.slice(0, 10);
        }
        return combined;
      });
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && files.length === 0) return;

    setIsSending(true);
    let uploadedAttachments: any[] = [];

    // 1. Upload files first if any
    if (files.length > 0) {
      const formData = new FormData();
      
      // Compress images before appending
      for (const f of files) {
        if (f.type.startsWith("image/")) {
           try {
              const options = {
                 maxSizeMB: 1, // Compress to max 1MB
                 maxWidthOrHeight: 1920,
                 useWebWorker: true
              };
              const compressedBlob = await imageCompression(f, options);
              // Convert blob back to file so it has a name
              const compressedFile = new File([compressedBlob], f.name, { type: f.type });
              formData.append("files", compressedFile);
           } catch (error) {
              console.error("Compression error:", error);
              // Fallback to original if compression fails
              formData.append("files", f);
           }
        } else {
           // Not an image, append directly (e.g. PDF)
           formData.append("files", f);
        }
      }
      
      try {
        const token = localStorage.getItem("token");
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
        const res = await fetch(`${apiUrl}/api/chat/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });
        const data = await res.json();
        
        if (data.success) {
          uploadedAttachments = data.data; // Array of { url, name, type, size }
        } else {
          toast.error(data.message || "File upload failed");
          setIsSending(false);
          return;
        }
      } catch (err) {
        console.error("Upload error:", err);
        toast.error("Error uploading files to server");
        setIsSending(false);
        return;
      }
    }

    // 2. Send via Socket
    const socket = getSocket();

    // Send the text message if present
    if (text.trim()) {
      socket.emit("send_message", { groupId, messageText: text });
    }

    // Send each file as its own chat message (WhatsApp style)
    uploadedAttachments.forEach(att => {
      socket.emit("send_message", {
        groupId,
        messageText: "",
        attachmentUrl: att.url,
        attachmentName: att.name,
        attachmentType: att.type
      });
    });

    // Reset
    setText("");
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsSending(false);
  };

  return (
    <div className="p-4 bg-background border-t border-border/70 flex flex-col gap-2">
      {/* File Preview Area */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 max-w-3xl mx-auto w-full">
          {files.map((file, i) => (
            <div key={i} className="relative flex items-center gap-2 bg-accent/50 p-2 rounded-md border text-sm max-w-[200px]">
              <span className="truncate">{file.name}</span>
              <button 
                type="button" 
                onClick={() => removeFile(i)}
                className="text-muted-foreground hover:text-destructive absolute -top-2 -right-2 bg-background border rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSend} className="flex gap-2 max-w-3xl mx-auto w-full items-center">
        {/* Hidden File Input */}
        <input 
          type="file" 
          multiple 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*,application/pdf,.doc,.docx"
        />
        
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={isSending}
          className="rounded-full shrink-0 text-muted-foreground hover:text-primary"
        >
          <Paperclip className="h-5 w-5" />
        </Button>

        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-accent/50 border border-border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
          disabled={isSending}
        />

        <Button 
          type="submit" 
          disabled={(!text.trim() && files.length === 0) || isSending}
          size="icon"
          className="rounded-full shrink-0 shadow-md bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}
