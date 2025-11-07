import { create } from 'zustand';
import { IdentityRecord, ContactRecord, ConversationRecord, MessageEnvelope } from '@pichat/types';

type State = {
  identity?: IdentityRecord;
  contacts: ContactRecord[];
  conversations: ConversationRecord[];
  messages: Record<string, MessageEnvelope[]>;
  setIdentity(i: IdentityRecord): void;
  addContact(c: ContactRecord): void;
  addConversation(c: ConversationRecord): void;
  addMessage(conversationId: string, m: MessageEnvelope): void;
};

export const useStore = create<State>((set, get) => ({
  contacts: [],
  conversations: [],
  messages: {},
  setIdentity: (i) => set({ identity: i }),
  addContact: (c) => set((s) => ({ contacts: [...s.contacts, c] })),
  addConversation: (c) => set((s) => ({ conversations: [...s.conversations, c] })),
  addMessage: (id, m) => set((s) => ({ messages: { ...s.messages, [id]: [...(s.messages[id] ?? []), m] } }))
}));
