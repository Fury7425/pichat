import { SignalProtocolAddress, StorageType, KeyPairType, Direction } from 'libsignal-protocol-typescript';
import { repo } from '@pichat/storage';
import { now, ulid } from '@pichat/utils';
import { loadSecret, storeSecret, deleteSecret } from './keychain';
import { IdentityRecord, PreKeyRecord, StoredSessionRecord } from '@pichat/types';

type PreKeyEntry = { type: 'one-time' | 'signed'; record: KeyPairType; ref: string };

type Value = ArrayBuffer | KeyPairType | number | string | PreKeyEntry | undefined;

function ensureArrayBuffer(data: Uint8Array): ArrayBuffer {
  if (data.buffer instanceof ArrayBuffer) {
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  }
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  return copy.buffer;
}

function buffersEqual(a: ArrayBuffer, b: ArrayBuffer): boolean {
  if (a.byteLength !== b.byteLength) {
    return false;
  }
  const viewA = new Uint8Array(a);
  const viewB = new Uint8Array(b);
  for (let i = 0; i < viewA.length; i += 1) {
    if (viewA[i] !== viewB[i]) {
      return false;
    }
  }
  return true;
}

function binaryToArrayBuffer(binary: string): ArrayBuffer {
  const view = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    view[i] = binary.charCodeAt(i) & 0xff;
  }
  return view.buffer;
}

function arrayBufferToBinary(buffer: ArrayBuffer): string {
  const view = new Uint8Array(buffer);
  let result = '';
  for (let i = 0; i < view.length; i += 1) {
    result += String.fromCharCode(view[i]);
  }
  return result;
}

export class RealmSignalProtocolStore implements StorageType {
  private backing = new Map<string, Value>();

  private identity?: IdentityRecord;

  async hydrate(): Promise<void> {
    const identity = await repo.getIdentity();
    if (identity) {
      const secret = await loadSecret(identity.privateKeyRef);
      if (!secret) {
        throw new Error('identity secret missing');
      }
      this.identity = identity;
      this.backing.set('identityKey', {
        pubKey: ensureArrayBuffer(secret.slice(32)),
        privKey: ensureArrayBuffer(secret.slice(0, 32))
      } as KeyPairType);
      this.backing.set('registrationId', identity.registrationId);
    }
  }

  async createIdentity(record: IdentityRecord, keyPair: KeyPairType, serialized: Uint8Array): Promise<void> {
    await repo.upsertIdentity({
      publicKey: record.publicKey,
      privateKeyRef: record.privateKeyRef,
      fingerprint: record.fingerprint,
      registrationId: record.registrationId,
      lastPreKeyRotationAt: record.lastPreKeyRotationAt
    });
    await storeSecret(record.privateKeyRef, serialized);
    this.identity = record;
    this.backing.set('identityKey', keyPair);
    this.backing.set('registrationId', record.registrationId);
  }

  async deleteIdentity(): Promise<void> {
    if (this.identity) {
      await deleteSecret(this.identity.privateKeyRef);
    }
    this.identity = undefined;
    this.backing.delete('identityKey');
@@ -62,168 +102,148 @@ export class RealmSignalProtocolStore implements SignalProtocolStore {
          createdAt: record.createdAt
        }
      ]);
    }
    await storeSecret(record.privateKeyRef, serialized);
    this.backing.set(this.preKeyKey(record.keyId), {
      type: record.type,
      record: keyPair,
      ref: record.privateKeyRef
    });
  }

  async popOneTimePreKey(): Promise<PreKeyRecord | undefined> {
    const record = await repo.prekeys.popOneTime();
    if (!record) {
      return undefined;
    }
    const serialized = await loadSecret(record.privateKeyRef);
    if (!serialized) {
      throw new Error('missing prekey secret');
    }
    this.backing.delete(this.preKeyKey(record.keyId));
    return record;
  }

  private getValue<T extends Value>(key: string): T | undefined {
    return this.backing.get(key) as T | undefined;
  }

  async getIdentityKeyPair(): Promise<KeyPairType | undefined> {
    return this.getValue<KeyPairType>('identityKey');
  }

  async getLocalRegistrationId(): Promise<number | undefined> {
    return this.getValue<number>('registrationId');
  }

  async storeIdentityKeyPair(keyPair: KeyPairType): Promise<void> {
    this.backing.set('identityKey', keyPair);
  }

  async storeLocalRegistrationId(id: number): Promise<void> {
    this.backing.set('registrationId', id);
  }

  async isTrustedIdentity(identifier: string, identityKey: ArrayBuffer, _direction: Direction): Promise<boolean> {
    const existing = this.getValue<ArrayBuffer>(`identityKey:${identifier}`);
    if (!existing) {
      return true;
    }
    return buffersEqual(existing, identityKey);
  }

  async saveIdentity(identifier: string, key: ArrayBuffer): Promise<boolean> {
    const existing = this.getValue<ArrayBuffer>(`identityKey:${identifier}`);
    this.backing.set(`identityKey:${identifier}`, key);
    return !!existing && !buffersEqual(existing, key);
  }

  async loadPreKey(keyId: number | string): Promise<KeyPairType | undefined> {
    const entry = this.getValue<PreKeyEntry>(this.preKeyKey(keyId));
    return entry?.record;
  }

  async storePreKey(keyId: number | string, keyPair: KeyPairType): Promise<void> {
    this.backing.set(this.preKeyKey(keyId), { type: 'one-time', record: keyPair, ref: `prekey-${keyId}` });
  }

  async removePreKey(keyId: number | string): Promise<void> {
    this.backing.delete(this.preKeyKey(keyId));
  }

  async loadSignedPreKey(keyId: number | string): Promise<KeyPairType | undefined> {
    const entry = this.getValue<PreKeyEntry>(this.signedPreKeyKey(keyId));
    return entry?.record;
  }

  async storeSignedPreKey(keyId: number | string, keyPair: KeyPairType): Promise<void> {
    this.backing.set(this.signedPreKeyKey(keyId), { type: 'signed', record: keyPair, ref: `signed-${keyId}` });
  }

  async removeSignedPreKey(keyId: number | string): Promise<void> {
    this.backing.delete(this.signedPreKeyKey(keyId));
  }

  async loadSession(address: string): Promise<string | undefined> {
    return this.getValue<string>(`session:${address}`);
  }

  async storeSession(address: string, record: string): Promise<void> {
    this.backing.set(`session:${address}`, record);
  }

  async containsSession(address: SignalProtocolAddress): Promise<boolean> {
    return this.backing.has(`session:${address.toString()}`);
  }

  async removeSession(address: string): Promise<void> {
    this.backing.delete(`session:${address}`);
  }

  private preKeyKey(keyId: number | string): string {
    return `preKey:${keyId}`;
  }

  private signedPreKeyKey(keyId: number | string): string {
    return `signedPreKey:${keyId}`;
  }
}

export async function hydrateStoreWithSessions(store: RealmSignalProtocolStore): Promise<void> {
  const contacts = await repo.contacts.all();
  for (const contact of contacts) {
    const session = await repo.sessions.getByRemote(contact.publicKey);
    if (session) {
      const address = new SignalProtocolAddress(contact.publicKey, 1);
      await store.storeSession(address.toString(), arrayBufferToBinary(session.sessionState));
    }
  }
}

export async function persistSession(address: SignalProtocolAddress, record: string): Promise<void> {
  const contact = await repo.contacts.getByPub(address.getName());
  if (!contact) {
    throw new Error('contact missing for session');
  }
  const existing = await repo.sessions.getByRemote(contact.publicKey);
  const stored: StoredSessionRecord = {
    id: existing?.id ?? ulid(),
    contactId: contact.id,
    remotePublicKey: contact.publicKey,
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now(),
    sessionState: binaryToArrayBuffer(record)
  };
  await repo.sessions.save(stored);
}

export async function removeSession(address: SignalProtocolAddress): Promise<void> {
  const contact = await repo.contacts.getByPub(address.getName());
  if (!contact) {
    return;
  }
  const existing = await repo.sessions.getByRemote(contact.publicKey);
  if (existing) {
    await repo.sessions.remove(existing.id);
  }
}
