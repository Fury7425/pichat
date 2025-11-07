export type Timestamp = number;

export interface IdentityRecord {
  id: string;
  publicKey: string;
  privateKeyRef: string;
  fingerprint: string;
  registrationId: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastPreKeyRotationAt?: Timestamp;
}

export type ContactVerificationStatus = 'unverified' | 'verified';

export interface ContactRecord {
  id: string;
  publicKey: string;
  alias?: string;
  verificationStatus: ContactVerificationStatus;
  fingerprint: string;
  addedAt: Timestamp;
  verifiedAt?: Timestamp;
  lastSeenAt?: Timestamp;
  identityRegistrationId?: number;
  preKey?: {
    signedPreKeyId: number;
    signedPreKey: string;
    signedPreKeySignature: string;
    oneTimePreKeyId?: number;
    oneTimePreKey?: string;
  };
}

export interface ConversationRecord {
  id: string;
  contactId: string;
  topic: string;
  unreadCount: number;
  lastMessageId?: string;
  lastMessageAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  mutedUntil?: Timestamp;
}

export type MessageStatus = 'pending' | 'sent' | 'received' | 'failed' | 'read';

export interface MessageEnvelope {
  id: string;
  conversationId: string;
  senderPublicKey: string;
  cipherTextB64: string;
  ivB64: string;
  sentAt: Timestamp;
  receivedAt?: Timestamp;
  decryptedText?: string;
  status: MessageStatus;
  deliveryId?: string;
  ratchetCounter?: number;
}

export interface AttachmentRecord {
  id: string;
  conversationId: string;
  messageId: string;
  mimeType: string;
  size: number;
  remoteUrl?: string;
  localUri?: string;
  createdAt: Timestamp;
}

export type PreKeyType = 'one-time' | 'signed';

export interface PreKeyRecord {
  id: string;
  keyId: number;
  type: PreKeyType;
  publicKey: string;
  privateKeyRef: string;
  createdAt: Timestamp;
  consumedAt?: Timestamp;
}

export interface RecoveryKitMetadata {
  createdAt: Timestamp;
  version: number;
  fingerprint: string;
  preKeyCount: number;
}

export interface RecoveryKit {
  metadata: RecoveryKitMetadata;
  encryptedBundle: Uint8Array;
}

export interface StoredSessionRecord {
  id: string;
  contactId: string;
  remotePublicKey: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  sessionState: ArrayBuffer;
}

export interface PaginationOptions {
  limit?: number;
  before?: Timestamp;
}
