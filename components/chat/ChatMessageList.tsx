"use client";

import { useChatStore, ChatMessage as ChatMessageType } from "@/lib/chatStore";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Trash2, FileText, Download } from "lucide-react";
import { toast } from "sonner";
import { getSocket } from "@/lib/socket";

export function ChatMessageList({ groupId }: { groupId: number }) {
  const messagesFromStore = useChatStore((state) => state.messages[groupId]);
  const messages = messagesFromStore || [];
  const removeMessage = useChatStore((state) => state.removeMessage);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [currentUserId, setCurrentUserId] = useState(-1);
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    try {
      const info = localStorage.getItem("userInfo");
      if (info) {
        const parsed = JSON.parse(info);
        setCurrentUserId(parsed.id);
        setCurrentUserRole(parsed.role?.toUpperCase() || "");
      }
    } catch (e) {}

    // Listen for global delete_message event
    const socket = getSocket();
    const handleDelete = (data: { messageId: number, groupId: number }) => {
       if (Number(data.groupId) === Number(groupId)) {
          removeMessage(data.groupId, data.messageId);
       }
    };
    socket.on("delete_message", handleDelete);

    return () => {
       socket.off("delete_message", handleDelete);
    };
  }, [groupId, removeMessage]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleDeleteMessage = async (messageId: number) => {
     if (!confirm("Are you sure you want to delete this message?")) return;
     setDeletingId(messageId);
     try {
        const token = localStorage.getItem("token");
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
        // Remove trailing slash if it exists
        const baseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
        
        // Some NEXT_PUBLIC_API_URL values already include /api (like arise/api), some don't.
        // We will assume NEXT_PUBLIC_API_URL includes the base path up to /api in production.
        const endpoint = baseUrl.endsWith('/api') 
           ? `${baseUrl}/chat-messages/${messageId}` 
           : `${baseUrl}/api/chat-messages/${messageId}`;

        const res = await fetch(endpoint, {
           method: "DELETE",
           headers: {
             Authorization: `Bearer ${token}`
           }
        });
        const data = await res.json();
        if (!data.success) {
           toast.error(data.message || "Failed to delete message");
        }
     } catch (err) {
        toast.error("Error deleting message");
     }
     setDeletingId(null);
  };

  return (
    <ScrollArea className="h-full px-4 py-6">
      <div className="flex flex-col gap-4 max-w-3xl mx-auto w-full">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-10">
            No messages yet. Say hello!
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.sender_id === currentUserId;
            const isImage = msg.attachment_type?.startsWith("image/");
            
            return (
              <div
                key={msg.id || index}
                className={cn(
                  "flex flex-col max-w-[75%] group",
                  isMe ? "self-end items-end" : "self-start items-start"
                )}
              >
                {!isMe && (
                  <span className="text-xs text-muted-foreground mb-1 ml-1 font-medium">
                    {msg.sender_name} <span className="opacity-70 font-normal">({msg.sender_role})</span>
                  </span>
                )}
                
                <div className={cn("flex items-center gap-2", isMe ? "flex-row-reverse" : "flex-row")}>
                  <div
                    className={cn(
                      "px-4 py-2 text-sm shadow-sm relative",
                      isMe 
                        ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm" 
                        : "bg-muted text-foreground rounded-2xl rounded-tl-sm"
                    )}
                  >
                    {/* Attachment Rendering */}
                    {msg.attachment_url && (
                      <div className="mb-2">
                        {isImage ? (
                          <a href={msg.attachment_url} target="_blank" rel="noreferrer">
                            <img 
                              src={msg.attachment_url} 
                              alt="attachment" 
                              className="max-w-[200px] sm:max-w-[300px] max-h-[300px] object-cover rounded-md cursor-pointer hover:opacity-90 transition-opacity bg-background/20"
                            />
                          </a>
                        ) : (
                          <a 
                            href={msg.attachment_url} 
                            target="_blank" 
                            rel="noreferrer"
                            className={cn(
                              "flex items-center gap-2 p-2 rounded-md border text-xs",
                              isMe ? "bg-primary-foreground/10 border-primary-foreground/20 hover:bg-primary-foreground/20 text-primary-foreground" : "bg-background border-border hover:bg-accent text-foreground"
                            )}
                          >
                            <FileText className="h-6 w-6 shrink-0" />
                            <span className="truncate max-w-[150px]">{msg.attachment_name || "Document"}</span>
                            <Download className="h-4 w-4 shrink-0 ml-1" />
                          </a>
                        )}
                      </div>
                    )}
                    
                    {/* Text content */}
                    {msg.message_text && <div>{msg.message_text}</div>}
                  </div>

                  {/* Admin Delete Button */}
                  {currentUserRole === 'ADMIN' && (
                    <button
                      onClick={() => handleDeleteMessage(msg.id)}
                      disabled={deletingId === msg.id}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-all shrink-0"
                      title="Delete Message"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <span className="text-[10px] text-muted-foreground mt-1 mx-1 opacity-70">
                  {format(new Date(msg.created_at), "h:mm a")}
                </span>
              </div>
            );
          })
        )}
        <div ref={scrollRef} />
      </div>
    </ScrollArea>
  );
}
