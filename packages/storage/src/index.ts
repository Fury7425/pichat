import { ulid, now } from '@pichat/utils';
import { IdentityRecord, ContactRecord, ConversationRecord, MessageEnvelope } from '@pichat/types';

const db = {
  identity: undefined as IdentityRecord | undefined,
  contacts: new Map<string, ContactRecord>(),
  conversations: new Map<string, ConversationRecord>(),
  messages: new Map<string, MessageEnvelope[]>()
};

export const repo = {
  async upsertIdentity(payload: Omit<IdentityRecord, 'id'|'createdAt'|'updatedAt'>) {
    const rec: IdentityRecord = {
      id: 'identity',
      createdAt: now(),
      updatedAt: now(),
      ...payload
    };
    db.identity = rec;
    return rec;
  },
  async contacts() {
    return {
      add(contact: ContactRecord) {
        const rec = { ...contact };
        db.contacts.set(rec.id, rec);
        return rec;
      },
      getByPub(pub: string) { return Array.from(db.contacts.values()).find(c => c.publicKey === pub); },
      all() { return Array.from(db.contacts.values()); },
      verify(id: string) {
        const c = db.contacts.get(id);
        if (c) { c.verifiedAt = now(); db.contacts.set(id, c); }
      },
      setAlias(id: string, alias: string) {
        const c = db.contacts.get(id);
        if (c) { c.alias = alias; db.contacts.set(id, c); }
      }
    };
  },
  async conversations() {
    return {
      openForPeer(contactId: string, topic: string) {
        const id = ulid();
        const rec: ConversationRecord = {
          id, contactId, topic, unreadCount: 0, createdAt: now(), updatedAt: now()
        };
        db.conversations.set(id, rec);
        return rec;
      },
      list() { return Array.from(db.conversations.values()); },
      bump(id: string) {
        const c = db.conversations.get(id);
        if (c) { c.updatedAt = now(); db.conversations.set(id, c); }
      }
    };
  },
  async messages() {
    return {
      addCipher(message: MessageEnvelope) {
        const list = db.messages.get(message.conversationId) ?? [];
        list.push(message);
        db.messages.set(message.conversationId, list);
        return message;
      },
      addPlainDecrypted(message: MessageEnvelope & { decryptedText: string }) {
        const list = db.messages.get(message.conversationId) ?? [];
        list.push(message);
        db.messages.set(message.conversationId, list);
        return message;
      },
      byConversation(conversationId: string) { return (db.messages.get(conversationId) ?? []).slice(); },
      markRead(conversationId: string) {
        const list = db.messages.get(conversationId) ?? [];
        list.forEach(m => m.status = 'read');
        db.messages.set(conversationId, list);
      },
      lastN(conversationId: string, limit: number) { return (db.messages.get(conversationId) ?? []).slice(-limit); }
    };
  }
};
