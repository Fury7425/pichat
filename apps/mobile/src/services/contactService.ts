import { repo } from '@pichat/storage';
import { ContactRecord, ConversationRecord } from '@pichat/types';
import { useStore } from '../state/store';
import { topicForPeers } from '@pichat/network';

export async function addContact(payload: Omit<ContactRecord, 'id' | 'addedAt'>): Promise<ContactRecord> {
  const record = await repo.contacts.add(payload);
  useStore.getState().upsertContact(record);
  return record;
}

export async function openConversation(peerPublicKey: string): Promise<ConversationRecord> {
  const contacts = useStore.getState().contacts;
  const identity = useStore.getState().identity;
  if (!identity) {
    throw new Error('identity missing');
  }
  const contact = contacts.find((item) => item.publicKey === peerPublicKey);
  if (!contact) {
    throw new Error('contact missing');
  }
  const topic = topicForPeers(identity.publicKey, peerPublicKey);
  const existing = await repo.conversations.getByTopic(topic);
  if (existing) {
    useStore.getState().updateConversation(existing);
    return existing;
  }
  const conversation = await repo.conversations.openForPeer(contact.id, topic);
  useStore.getState().updateConversation(conversation);
  return conversation;
}

export async function listConversations(): Promise<ConversationRecord[]> {
  const conversations = await repo.conversations.list();
  useStore.getState().setConversations(conversations);
  return conversations;
}
