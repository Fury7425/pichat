import { SignalProtocolAddress, SignalProtocolStore, KeyPairType } from 'libsignal-protocol-typescript';
import { repo } from '@pichat/storage';
import { now, ulid } from '@pichat/utils';
import { loadSecret, storeSecret, deleteSecret } from './keychain';
import { IdentityRecord, PreKeyRecord, StoredSessionRecord } from '@pichat/types';

type Value = ArrayBuffer | KeyPairType | number | string | undefined;

type PreKeyEntry = { type: 'one-time' | 'signed'; record: KeyPairType; ref: string };

export class RealmSignalProtocolStore implements SignalProtocolStore {
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
        pubKey: toArrayBuffer(secret.slice(32)),
        privKey: toArrayBuffer(secret.slice(0, 32))
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
    this.backing.delete('registrationId');
  }

  async storePreKeyRecord(record: PreKeyRecord, keyPair: KeyPairType, serialized: Uint8Array): Promise<void> {
    if (record.type === 'signed') {
      await repo.prekeys.rotateSigned(record);
    } else {
      await repo.prekeys.addMany([
        {
          ...record,
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

  get<T>(key: string, defaultValue?: T): T {
    const value = this.backing.get(key);
    if (value === undefined) {
      return defaultValue as T;
    }
    return value as T;
  }

  put<T>(key: string, value: T): void {
    this.backing.set(key, value as unknown as Value);
  }

  remove(key: string): void {
    this.backing.delete(key);
  }

  getIdentityKeyPair(): KeyPairType | undefined {
    return this.get<KeyPairType>('identityKey');
  }

  getLocalRegistrationId(): number | undefined {
    return this.get<number>('registrationId');
  }

  storeIdentityKeyPair(keyPair: KeyPairType): void {
    this.backing.set('identityKey', keyPair);
  }

  storeLocalRegistrationId(id: number): void {
    this.backing.set('registrationId', id);
  }

  isTrustedIdentity(address: SignalProtocolAddress, identityKey: ArrayBuffer, _direction: 'incoming' | 'outgoing'): boolean {
    const existing = this.getIdentity(address.toString());
    if (!existing) {
      return true;
    }
    return Buffer.compare(Buffer.from(existing), Buffer.from(identityKey)) === 0;
  }

  getIdentity(address: string): ArrayBuffer | undefined {
    return this.get<ArrayBuffer>(`identityKey:${address}`);
  }

  saveIdentity(address: string, key: ArrayBuffer): boolean {
    const existing = this.get<ArrayBuffer>(`identityKey:${address}`);
    this.put(`identityKey:${address}`, key);
    return !!existing && Buffer.compare(Buffer.from(existing), Buffer.from(key)) !== 0;
  }

  storePreKey(keyId: number, keyPair: KeyPairType): void {
    this.backing.set(this.preKeyKey(keyId), { type: 'one-time', record: keyPair, ref: `prekey-${keyId}` });
  }

  loadPreKey(keyId: number): KeyPairType | undefined {
    const entry = this.backing.get(this.preKeyKey(keyId)) as PreKeyEntry | undefined;
    return entry?.record;
  }

  removePreKey(keyId: number): void {
    this.backing.delete(this.preKeyKey(keyId));
  }

  storeSignedPreKey(keyId: number, keyPair: KeyPairType): void {
    this.backing.set(this.signedPreKeyKey(keyId), { type: 'signed', record: keyPair, ref: `signed-${keyId}` });
  }

  loadSignedPreKey(keyId: number): KeyPairType | undefined {
    const entry = this.backing.get(this.signedPreKeyKey(keyId)) as PreKeyEntry | undefined;
    return entry?.record;
  }

  removeSignedPreKey(keyId: number): void {
    this.backing.delete(this.signedPreKeyKey(keyId));
  }

  loadSession(address: SignalProtocolAddress): ArrayBuffer | undefined {
    return this.get<ArrayBuffer>(`session:${address.toString()}`);
  }

  storeSession(address: SignalProtocolAddress, record: ArrayBuffer): void {
    this.put(`session:${address.toString()}`, record);
  }

  containsSession(address: SignalProtocolAddress): boolean {
    return this.backing.has(`session:${address.toString()}`);
  }

  removeSession(address: SignalProtocolAddress): void {
    this.backing.delete(`session:${address.toString()}`);
  }

  private preKeyKey(keyId: number): string {
    return `preKey:${keyId}`;
  }

  private signedPreKeyKey(keyId: number): string {
    return `signedPreKey:${keyId}`;
  }
}

function toArrayBuffer(data: Uint8Array): ArrayBuffer {
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
}

export async function hydrateStoreWithSessions(store: RealmSignalProtocolStore): Promise<void> {
  const contacts = await repo.contacts.all();
  for (const contact of contacts) {
    const session = await repo.sessions.getByRemote(contact.publicKey);
    if (session) {
      const address = new SignalProtocolAddress(contact.publicKey, 1);
      store.storeSession(address, session.sessionState);
    }
  }
}

export async function persistSession(address: SignalProtocolAddress, record: ArrayBuffer): Promise<void> {
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
    sessionState: record
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
