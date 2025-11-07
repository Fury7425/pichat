import { create } from 'zustand';
import type { Conversation, Message, Identity } from './types';
import { decryptFrom, encryptFor } from './miniCrypto';

type S = {
  me?: Identity;
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  setMe: (me: Identity) => void;
  addPeer: (peerPubKeyB64: string) => Conversation;
  send: (c: Conversation, text: string) => Promise<Message>;
  receive: (c: Conversation, ivB64: string, ctB64: string) => Promise<Message>;
};

export const useStore = create<S>((set, get) => ({
  conversations: [],
  messages: {},
  setMe: (me) => set({ me }),
  addPeer: (peerPubKeyB64) => {
    const id = `conv_${peerPubKeyB64.slice(0, 6)}`;
    const c = { id, peerPubKeyB64, lastMessageAt: Date.now() };
    set((s) => ({ conversations: [c, ...s.conversations] }));
    return c;
  },
  send: async (c, text) => {
    const me = get().me!;
    const env = await encryptFor(me.privKeyJwk, c.peerPubKeyB64, new TextEncoder().encode(text));
    const m: Message = {
      id: env.id,
      conversationId: c.id,
      sender: 'me',
      ciphertextB64: `${env.ivB64}.${env.ctB64}`,
      sentAt: Date.now(),
      plaintext: text
    };
    set((s) => ({
      messages: { ...s.messages, [c.id]: [...(s.messages[c.id] || []), m] }
    }));
    return m;
  },
  receive: async (c, ivB64, ctB64) => {
    const me = get().me!;
    const pt = await decryptFrom(me.privKeyJwk, c.peerPubKeyB64, ivB64, ctB64);
    const text = new TextDecoder().decode(pt);
    const m: Message = {
      id: crypto.randomUUID(),
      conversationId: c.id,
      sender: 'peer',
      ciphertextB64: `${ivB64}.${ctB64}`,
      sentAt: Date.now(),
      plaintext: text
    };
    set((s) => ({
      messages: { ...s.messages, [c.id]: [...(s.messages[c.id] || []), m] }
    }));
    return m;
  }
}));
