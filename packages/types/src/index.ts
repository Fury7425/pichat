export type IdentityRecord = {
  id: string;
  publicKey: string;
  privateKeyRef: string;
  fingerprint: string;
  createdAt: number;
  updatedAt: number;
};

export type ContactRecord = {
  id: string;
  publicKey: string;
  alias?: string;
  verifiedAt?: number;
  fingerprint: string;
  lastSeenAt?: number;
};

export type ConversationRecord = {
  id: string;
  contactId: string;
  topic: string;
  unreadCount: number;
  lastMessageId?: string;
  lastMessageAt?: number;
  createdAt: number;
  updatedAt: number;
};

export type MessageEnvelope = {
  id: string;
  conversationId: string;
  senderPublicKey: string;
  cipherTextB64: string;
  ivB64: string;
  sentAt: number;
  receivedAt?: number;
  decryptedText?: string;
  status: 'pending' | 'sent' | 'received' | 'failed' | 'read';
};
