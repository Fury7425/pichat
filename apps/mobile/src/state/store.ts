import { create } from 'zustand';
import {
  IdentityRecord,
  ContactRecord,
  ConversationRecord,
  MessageEnvelope
} from '@pichat/types';

type IdentitySlice = {
  identity?: IdentityRecord;
  setIdentity: (identity: IdentityRecord) => void;
  clearIdentity: () => void;
};

type ContactsSlice = {
  contacts: ContactRecord[];
  setContacts: (contacts: ContactRecord[]) => void;
  upsertContact: (contact: ContactRecord) => void;
};

type ConversationsSlice = {
  conversations: ConversationRecord[];
  setConversations: (conversations: ConversationRecord[]) => void;
  updateConversation: (conversation: ConversationRecord) => void;
};

type MessagesSlice = {
  messages: Record<string, MessageEnvelope[]>;
  appendMessage: (conversationId: string, message: MessageEnvelope) => void;
  replaceMessages: (conversationId: string, items: MessageEnvelope[]) => void;
};

type StoreState = IdentitySlice & ContactsSlice & ConversationsSlice & MessagesSlice;

export const useStore = create<StoreState>((set) => ({
  identity: undefined,
  contacts: [],
  conversations: [],
  messages: {},
  setIdentity: (identity) => set({ identity }),
  clearIdentity: () => set({ identity: undefined, contacts: [], conversations: [], messages: {} }),
  setContacts: (contacts) => set({ contacts }),
  upsertContact: (contact) =>
    set((state) => {
      const index = state.contacts.findIndex((c) => c.id === contact.id);
      if (index >= 0) {
        const next = state.contacts.slice();
        next[index] = contact;
        return { contacts: next };
      }
      return { contacts: [...state.contacts, contact] };
    }),
  setConversations: (conversations) => set({ conversations }),
  updateConversation: (conversation) =>
    set((state) => {
      const index = state.conversations.findIndex((c) => c.id === conversation.id);
      if (index >= 0) {
        const next = state.conversations.slice();
        next[index] = conversation;
        return { conversations: next };
      }
      return { conversations: [...state.conversations, conversation] };
    }),
  appendMessage: (conversationId, message) =>
    set((state) => {
      const next = state.messages[conversationId] ? state.messages[conversationId].slice() : [];
      next.push(message);
      return { messages: { ...state.messages, [conversationId]: next } };
    }),
  replaceMessages: (conversationId, items) =>
    set((state) => ({ messages: { ...state.messages, [conversationId]: items } }))
}));
