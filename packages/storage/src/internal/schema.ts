import Realm, { ObjectSchema } from 'realm';

export class Identity extends Realm.Object<Identity> {
  _id!: string;
  publicKey!: string;
  privateKeyRef!: string;
  fingerprint!: string;
  registrationId!: number;
  createdAt!: number;
  updatedAt!: number;
  lastPreKeyRotationAt?: number;

  static schema: ObjectSchema = {
    name: 'Identity',
    primaryKey: '_id',
    properties: {
      _id: 'string',
      publicKey: { type: 'string', indexed: true },
      privateKeyRef: 'string',
      fingerprint: 'string',
      registrationId: 'int',
      createdAt: 'int',
      updatedAt: 'int',
      lastPreKeyRotationAt: { type: 'int', optional: true }
    }
  };
}

export class Contact extends Realm.Object<Contact> {
  _id!: string;
  publicKey!: string;
  alias?: string;
  verificationStatus!: string;
  fingerprint!: string;
  addedAt!: number;
  verifiedAt?: number;
  lastSeenAt?: number;
  identityRegistrationId?: number;
  preKeySignedId?: number;
  preKeySigned?: string;
  preKeySignature?: string;
  preKeyOneTimeId?: number;
  preKeyOneTime?: string;

  static schema: ObjectSchema = {
    name: 'Contact',
    primaryKey: '_id',
    properties: {
      _id: 'string',
      publicKey: 'string',
      alias: 'string?',
      verificationStatus: 'string',
      fingerprint: 'string',
      addedAt: 'int',
      verifiedAt: 'int?',
      lastSeenAt: 'int?',
      identityRegistrationId: 'int?',
      preKeySignedId: 'int?',
      preKeySigned: 'string?',
      preKeySignature: 'string?',
      preKeyOneTimeId: 'int?',
      preKeyOneTime: 'string?'
    }
  };
}

export class Conversation extends Realm.Object<Conversation> {
  _id!: string;
  contactId!: string;
  topic!: string;
  unreadCount!: number;
  lastMessageId?: string;
  lastMessageAt?: number;
  createdAt!: number;
  updatedAt!: number;
  mutedUntil?: number;

  static schema: ObjectSchema = {
    name: 'Conversation',
    primaryKey: '_id',
    properties: {
      _id: 'string',
      contactId: { type: 'string', indexed: true },
      topic: { type: 'string', indexed: true },
      unreadCount: 'int',
      lastMessageId: 'string?',
      lastMessageAt: 'int?',
      createdAt: 'int',
      updatedAt: { type: 'int', indexed: true },
      mutedUntil: 'int?'
    }
  };
}

export class Message extends Realm.Object<Message> {
  _id!: string;
  conversationId!: string;
  senderPublicKey!: string;
  cipherTextB64!: string;
  ivB64!: string;
  sentAt!: number;
  receivedAt?: number;
  decryptedText?: string;
  status!: string;
  deliveryId?: string;
  ratchetCounter?: number;

  static schema: ObjectSchema = {
    name: 'Message',
    primaryKey: '_id',
    properties: {
      _id: 'string',
      conversationId: { type: 'string', indexed: true },
      senderPublicKey: 'string',
      cipherTextB64: 'string',
      ivB64: 'string',
      sentAt: { type: 'int', indexed: true },
      receivedAt: 'int?',
      decryptedText: 'string?',
      status: 'string',
      deliveryId: 'string?',
      ratchetCounter: 'int?'
    }
  };
}

export class Attachment extends Realm.Object<Attachment> {
  _id!: string;
  conversationId!: string;
  messageId!: string;
  mimeType!: string;
  size!: number;
  remoteUrl?: string;
  localUri?: string;
  createdAt!: number;

  static schema: ObjectSchema = {
    name: 'Attachment',
    primaryKey: '_id',
    properties: {
      _id: 'string',
      conversationId: { type: 'string', indexed: true },
      messageId: { type: 'string', indexed: true },
      mimeType: 'string',
      size: 'int',
      remoteUrl: 'string?',
      localUri: 'string?',
      createdAt: 'int'
    }
  };
}

export class PreKey extends Realm.Object<PreKey> {
  _id!: string;
  keyId!: number;
  type!: string;
  publicKey!: string;
  privateKeyRef!: string;
  createdAt!: number;
  consumedAt?: number;

  static schema: ObjectSchema = {
    name: 'PreKey',
    primaryKey: '_id',
    properties: {
      _id: 'string',
      keyId: { type: 'int', indexed: true },
      type: { type: 'string', indexed: true },
      publicKey: 'string',
      privateKeyRef: 'string',
      createdAt: 'int',
      consumedAt: 'int?'
    }
  };
}

export class StoredSession extends Realm.Object<StoredSession> {
  _id!: string;
  contactId!: string;
  remotePublicKey!: string;
  createdAt!: number;
  updatedAt!: number;
  sessionState!: ArrayBuffer;

  static schema: ObjectSchema = {
    name: 'StoredSession',
    primaryKey: '_id',
    properties: {
      _id: 'string',
      contactId: { type: 'string', indexed: true },
      remotePublicKey: { type: 'string', indexed: true },
      createdAt: 'int',
      updatedAt: 'int',
      sessionState: 'data'
    }
  };
}

export const schemas: ObjectSchema[] = [
  Identity.schema,
  Contact.schema,
  Conversation.schema,
  Message.schema,
  Attachment.schema,
  PreKey.schema,
  StoredSession.schema
];

export const schemaVersion = 2;
