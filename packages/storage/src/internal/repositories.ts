import Realm from 'realm';
import {
  Identity,
  Contact,
  Conversation,
  Message,
  Attachment,
  PreKey,
  StoredSession
} from './schema';
import { getRealm } from './realm';
import {
  IdentityRecord,
  ContactRecord,
  ConversationRecord,
  MessageEnvelope,
  AttachmentRecord,
  PreKeyRecord,
  StoredSessionRecord,
  PaginationOptions
} from '@pichat/types';
import { now, ulid } from '@pichat/utils';

type WriteBlock<T> = (realm: Realm) => T;

async function write<T>(fn: WriteBlock<T>): Promise<T> {
  const realm = await getRealm();
  let result: T;
  realm.write(() => {
    result = fn(realm);
  });
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return result!;
}

function mapIdentity(object: Identity): IdentityRecord {
  return {
    id: object._id,
    publicKey: object.publicKey,
    privateKeyRef: object.privateKeyRef,
    fingerprint: object.fingerprint,
    registrationId: object.registrationId,
    createdAt: object.createdAt,
    updatedAt: object.updatedAt,
    lastPreKeyRotationAt: object.lastPreKeyRotationAt ?? undefined
  };
}

function mapContact(object: Contact): ContactRecord {
  return {
    id: object._id,
    publicKey: object.publicKey,
    alias: object.alias ?? undefined,
    verificationStatus: object.verificationStatus as ContactRecord['verificationStatus'],
    fingerprint: object.fingerprint,
    addedAt: object.addedAt,
    verifiedAt: object.verifiedAt ?? undefined,
    lastSeenAt: object.lastSeenAt ?? undefined,
    identityRegistrationId: object.identityRegistrationId ?? undefined,
    preKey: object.preKeySigned
      ? {
          signedPreKeyId: object.preKeySignedId ?? 0,
          signedPreKey: object.preKeySigned,
          signedPreKeySignature: object.preKeySignature ?? '',
          oneTimePreKeyId: object.preKeyOneTimeId ?? undefined,
          oneTimePreKey: object.preKeyOneTime ?? undefined
        }
      : undefined
  };
}

function mapConversation(object: Conversation): ConversationRecord {
  return {
    id: object._id,
    contactId: object.contactId,
    topic: object.topic,
    unreadCount: object.unreadCount,
    lastMessageId: object.lastMessageId ?? undefined,
    lastMessageAt: object.lastMessageAt ?? undefined,
    createdAt: object.createdAt,
    updatedAt: object.updatedAt,
    mutedUntil: object.mutedUntil ?? undefined
  };
}

function mapMessage(object: Message): MessageEnvelope {
  return {
    id: object._id,
    conversationId: object.conversationId,
    senderPublicKey: object.senderPublicKey,
    cipherTextB64: object.cipherTextB64,
    ivB64: object.ivB64,
    sentAt: object.sentAt,
    receivedAt: object.receivedAt ?? undefined,
    decryptedText: object.decryptedText ?? undefined,
    status: object.status as MessageEnvelope['status'],
    deliveryId: object.deliveryId ?? undefined,
    ratchetCounter: object.ratchetCounter ?? undefined
  };
}

function mapAttachment(object: Attachment): AttachmentRecord {
  return {
    id: object._id,
    conversationId: object.conversationId,
    messageId: object.messageId,
    mimeType: object.mimeType,
    size: object.size,
    remoteUrl: object.remoteUrl ?? undefined,
    localUri: object.localUri ?? undefined,
    createdAt: object.createdAt
  };
}

function mapPreKey(object: PreKey): PreKeyRecord {
  return {
    id: object._id,
    keyId: object.keyId,
    type: object.type as PreKeyRecord['type'],
    publicKey: object.publicKey,
    privateKeyRef: object.privateKeyRef,
    createdAt: object.createdAt,
    consumedAt: object.consumedAt ?? undefined
  };
}

function mapSession(object: StoredSession): StoredSessionRecord {
  return {
    id: object._id,
    contactId: object.contactId,
    remotePublicKey: object.remotePublicKey,
    createdAt: object.createdAt,
    updatedAt: object.updatedAt,
    sessionState: object.sessionState
  };
}

export const repo = {
  async upsertIdentity(payload: Omit<IdentityRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<IdentityRecord> {
    return write((realm) => {
      const existing = realm.objectForPrimaryKey<Identity>('Identity', 'identity');
      const timestamp = now();
      const record: IdentityRecord = {
        id: 'identity',
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: timestamp,
        ...payload
      };
      realm.create(
        'Identity',
        {
          _id: 'identity',
          publicKey: record.publicKey,
          privateKeyRef: record.privateKeyRef,
          fingerprint: record.fingerprint,
          registrationId: record.registrationId,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
          lastPreKeyRotationAt: record.lastPreKeyRotationAt ?? null
        },
        Realm.UpdateMode.Modified
      );
      return record;
    });
  },
  async getIdentity(): Promise<IdentityRecord | undefined> {
    const realm = await getRealm();
    const identity = realm.objectForPrimaryKey<Identity>('Identity', 'identity');
    return identity ? mapIdentity(identity) : undefined;
  },
  contacts: {
    async add(contact: Omit<ContactRecord, 'id' | 'addedAt'>): Promise<ContactRecord> {
      return write((realm) => {
        const id = ulid();
        const record: ContactRecord = {
          id,
          addedAt: now(),
          ...contact
        };
        realm.create('Contact', {
          _id: id,
          publicKey: record.publicKey,
          alias: record.alias ?? null,
          verificationStatus: record.verificationStatus,
          fingerprint: record.fingerprint,
          addedAt: record.addedAt,
          verifiedAt: record.verifiedAt ?? null,
          lastSeenAt: record.lastSeenAt ?? null,
          identityRegistrationId: record.identityRegistrationId ?? null,
          preKeySignedId: record.preKey?.signedPreKeyId ?? null,
          preKeySigned: record.preKey?.signedPreKey ?? null,
          preKeySignature: record.preKey?.signedPreKeySignature ?? null,
          preKeyOneTimeId: record.preKey?.oneTimePreKeyId ?? null,
          preKeyOneTime: record.preKey?.oneTimePreKey ?? null
        });
        return record;
      });
    },
    async getByPub(pub: string): Promise<ContactRecord | undefined> {
      const realm = await getRealm();
      const contact = realm.objects<Contact>('Contact').filtered('publicKey == $0', pub)[0];
      return contact ? mapContact(contact) : undefined;
    },
    async all(): Promise<ContactRecord[]> {
      const realm = await getRealm();
      return realm.objects<Contact>('Contact').map(mapContact);
    },
    async verify(id: string, verifiedAt = now()): Promise<void> {
      await write((realm) => {
        realm.create(
          'Contact',
          { _id: id, verificationStatus: 'verified', verifiedAt },
          Realm.UpdateMode.Modified
        );
      });
    },
    async setAlias(id: string, alias: string | undefined): Promise<void> {
      await write((realm) => {
        realm.create('Contact', { _id: id, alias: alias ?? null }, Realm.UpdateMode.Modified);
      });
    }
  },
  conversations: {
    async openForPeer(contactId: string, topic: string): Promise<ConversationRecord> {
      return write((realm) => {
        const id = ulid();
        const timestamp = now();
        realm.create('Conversation', {
          _id: id,
          contactId,
          topic,
          unreadCount: 0,
          lastMessageId: null,
          lastMessageAt: null,
          createdAt: timestamp,
          updatedAt: timestamp,
          mutedUntil: null
        });
        return mapConversation(realm.objectForPrimaryKey<Conversation>('Conversation', id)!);
      });
    },
    async getByTopic(topic: string): Promise<ConversationRecord | undefined> {
      const realm = await getRealm();
      const conversation = realm.objects<Conversation>('Conversation').filtered('topic == $0', topic)[0];
      return conversation ? mapConversation(conversation) : undefined;
    },
    async list(): Promise<ConversationRecord[]> {
      const realm = await getRealm();
      return realm.objects<Conversation>('Conversation').sorted('updatedAt', true).map(mapConversation);
    },
    async bump(id: string, lastMessageId?: string, lastMessageAt = now()): Promise<void> {
      await write((realm) => {
        realm.create(
          'Conversation',
          {
            _id: id,
            updatedAt: lastMessageAt,
            lastMessageId: lastMessageId ?? null,
            lastMessageAt
          },
          Realm.UpdateMode.Modified
        );
      });
    },
    async incrementUnread(id: string, by = 1): Promise<void> {
      await write((realm) => {
        const conversation = realm.objectForPrimaryKey<Conversation>('Conversation', id);
        const next = (conversation?.unreadCount ?? 0) + by;
        realm.create('Conversation', { _id: id, unreadCount: next }, Realm.UpdateMode.Modified);
      });
    },
    async markRead(id: string): Promise<void> {
      await write((realm) => {
        realm.create('Conversation', { _id: id, unreadCount: 0 }, Realm.UpdateMode.Modified);
      });
    }
  },
  messages: {
    async addCipher(message: MessageEnvelope): Promise<MessageEnvelope> {
      return write((realm) => {
        realm.create('Message', {
          _id: message.id,
          conversationId: message.conversationId,
          senderPublicKey: message.senderPublicKey,
          cipherTextB64: message.cipherTextB64,
          ivB64: message.ivB64,
          sentAt: message.sentAt,
          receivedAt: message.receivedAt ?? null,
          decryptedText: message.decryptedText ?? null,
          status: message.status,
          deliveryId: message.deliveryId ?? null,
          ratchetCounter: message.ratchetCounter ?? null
        }, Realm.UpdateMode.Never);
        return message;
      });
    },
    async addPlainDecrypted(message: MessageEnvelope & { decryptedText: string }): Promise<MessageEnvelope> {
      return write((realm) => {
        realm.create('Message', {
          _id: message.id,
          conversationId: message.conversationId,
          senderPublicKey: message.senderPublicKey,
          cipherTextB64: message.cipherTextB64,
          ivB64: message.ivB64,
          sentAt: message.sentAt,
          receivedAt: message.receivedAt ?? null,
          decryptedText: message.decryptedText,
          status: message.status,
          deliveryId: message.deliveryId ?? null,
          ratchetCounter: message.ratchetCounter ?? null
        }, Realm.UpdateMode.Modified);
        return message;
      });
    },
    async byConversation(conversationId: string, options: PaginationOptions = {}): Promise<MessageEnvelope[]> {
      const realm = await getRealm();
      const results = realm
        .objects<Message>('Message')
        .filtered('conversationId == $0', conversationId)
        .sorted('sentAt');
      const filtered = options.before ? results.filtered('sentAt < $0', options.before) : results;
      let messages = Array.from(filtered);
      if (options.limit) {
        messages = messages.slice(Math.max(0, messages.length - options.limit));
      }
      return messages.map(mapMessage);
    },
    async markRead(conversationId: string): Promise<void> {
      await write((realm) => {
        const messages = realm.objects<Message>('Message').filtered('conversationId == $0', conversationId);
        for (const message of messages) {
          realm.create('Message', { _id: message._id, status: 'read' }, Realm.UpdateMode.Modified);
        }
      });
    },
    async lastN(conversationId: string, limit: number): Promise<MessageEnvelope[]> {
      const realm = await getRealm();
      const results = realm
        .objects<Message>('Message')
        .filtered('conversationId == $0', conversationId)
        .sorted('sentAt', true)
        .slice(0, limit)
        .map(mapMessage)
        .reverse();
      return results;
    }
  },
  attachments: {
    async add(attachment: AttachmentRecord): Promise<AttachmentRecord> {
      return write((realm) => {
        realm.create('Attachment', {
          _id: attachment.id,
          conversationId: attachment.conversationId,
          messageId: attachment.messageId,
          mimeType: attachment.mimeType,
          size: attachment.size,
          remoteUrl: attachment.remoteUrl ?? null,
          localUri: attachment.localUri ?? null,
          createdAt: attachment.createdAt
        }, Realm.UpdateMode.Never);
        return attachment;
      });
    },
    async byMessage(messageId: string): Promise<AttachmentRecord[]> {
      const realm = await getRealm();
      return realm.objects<Attachment>('Attachment').filtered('messageId == $0', messageId).map(mapAttachment);
    }
  },
  prekeys: {
    async addMany(records: PreKeyRecord[]): Promise<void> {
      await write((realm) => {
        for (const record of records) {
          realm.create('PreKey', {
            _id: record.id,
            keyId: record.keyId,
            type: record.type,
            publicKey: record.publicKey,
            privateKeyRef: record.privateKeyRef,
            createdAt: record.createdAt,
            consumedAt: record.consumedAt ?? null
          }, Realm.UpdateMode.Never);
        }
      });
    },
    async popOneTime(): Promise<PreKeyRecord | undefined> {
      const realm = await getRealm();
      const preKey = realm
        .objects<PreKey>('PreKey')
        .filtered('type == $0 AND consumedAt == null', 'one-time')
        .sorted('createdAt')[0];
      if (!preKey) {
        return undefined;
      }
      await write((r) => {
        r.create('PreKey', { _id: preKey._id, consumedAt: now() }, Realm.UpdateMode.Modified);
      });
      return mapPreKey(preKey);
    },
    async rotateSigned(record: PreKeyRecord): Promise<void> {
      await write((realm) => {
        realm.create('PreKey', {
          _id: record.id,
          keyId: record.keyId,
          type: record.type,
          publicKey: record.publicKey,
          privateKeyRef: record.privateKeyRef,
          createdAt: record.createdAt,
          consumedAt: record.consumedAt ?? null
        }, Realm.UpdateMode.Modified);
      });
    },
    async clearAll(): Promise<void> {
      await write((realm) => {
        const existing = realm.objects<PreKey>('PreKey');
        realm.delete(existing);
      });
    },
    async findSigned(): Promise<PreKeyRecord | undefined> {
      const realm = await getRealm();
      const signed = realm
        .objects<PreKey>('PreKey')
        .filtered('type == $0', 'signed')
        .sorted('createdAt', true)[0];
      return signed ? mapPreKey(signed) : undefined;
    },
    async listAll(): Promise<PreKeyRecord[]> {
      const realm = await getRealm();
      return realm.objects<PreKey>('PreKey').map(mapPreKey);
    }
  },
  sessions: {
    async save(session: StoredSessionRecord): Promise<void> {
      await write((realm) => {
        realm.create('StoredSession', {
          _id: session.id,
          contactId: session.contactId,
          remotePublicKey: session.remotePublicKey,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
          sessionState: session.sessionState
        }, Realm.UpdateMode.Modified);
      });
    },
    async getByRemote(remotePublicKey: string): Promise<StoredSessionRecord | undefined> {
      const realm = await getRealm();
      const session = realm.objects<StoredSession>('StoredSession').filtered('remotePublicKey == $0', remotePublicKey)[0];
      return session ? mapSession(session) : undefined;
    },
    async remove(id: string): Promise<void> {
      await write((realm) => {
        const existing = realm.objectForPrimaryKey<StoredSession>('StoredSession', id);
        if (existing) {
          realm.delete(existing);
        }
      });
    }
  }
};
