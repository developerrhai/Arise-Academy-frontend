import { create } from 'zustand';

export type ChatGroup = {
  id: number;
  name: string;
  description: string;
  created_at: string;
  user_role: string;
};

export type ChatMessage = {
  id: number;
  group_id: number;
  sender_id: number;
  sender_role: string;
  sender_name: string;
  message_text: string;
  created_at: string;
};

interface ChatState {
  groups: ChatGroup[];
  activeGroupId: number | null;
  messages: Record<number, ChatMessage[]>; 
  typingUsers: Record<number, { userId: number, userName: string }[]>;
  
  setGroups: (groups: ChatGroup[]) => void;
  setActiveGroup: (id: number | null) => void;
  
  addMessage: (groupId: number, message: ChatMessage) => void;
  setMessages: (groupId: number, messages: ChatMessage[]) => void;
  
  setTyping: (groupId: number, userId: number, isTyping: boolean) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  groups: [],
  activeGroupId: null,
  messages: {},
  typingUsers: {},

  setGroups: (groups) => set({ groups }),
  
  setActiveGroup: (id) => set({ activeGroupId: id }),
  
  addMessage: (groupId, message) => 
    set((state) => {
      const existing = state.messages[groupId] || [];
      // Prevent duplicates if REST + Socket both deliver it
      if (existing.find(m => m.id === message.id)) return state;
      return {
        messages: {
          ...state.messages,
          [groupId]: [...existing, message] // append to bottom
        }
      };
    }),
    
  setMessages: (groupId, newMessages) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [groupId]: newMessages
      }
    })),
    
  setTyping: (groupId, userId, isTyping) =>
    set((state) => {
      const currentTyping = state.typingUsers[groupId] || [];
      if (isTyping) {
        if (!currentTyping.find(u => u.userId === userId)) {
           return {
             typingUsers: {
               ...state.typingUsers,
               [groupId]: [...currentTyping, { userId, userName: "Someone" }] // name logic could be expanded
             }
           };
        }
      } else {
        return {
          typingUsers: {
            ...state.typingUsers,
            [groupId]: currentTyping.filter(u => u.userId !== userId)
          }
        };
      }
      return state;
    }),
}));
