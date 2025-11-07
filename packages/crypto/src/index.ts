import { createHash } from 'crypto';
import {
  KeyHelper,
  SessionBuilder,
  SessionCipher,
  SignalProtocolAddress,
  KeyPairType,
  DeviceType,
  EncryptionResultMessageType
} from 'libsignal-protocol-typescript';
import { repo } from '@pichat/storage';
import {
  RealmSignalProtocolStore,
  hydrateStoreWithSessions,
  persistSession,
  removeSession as removeStoredSession
} from './signalStore';
import { seal, open } from './recovery';
import { fromBase64, now, toBase64, ulid } from '@pichat/utils';
import { IdentityRecord, PreKeyRecord, RecoveryKitMetadata } from '@pichat/types';
import { loadSecret } from './keychain';

export type PreKeyBundle = {
  registrationId: number;
  identityKey: string;
  preKeyId: number;
  preKeyPublic: string;
  signedPreKeyId: number;
  signedPreKeyPublic: string;
  signedPreKeySignature: string;
  oneTimePreKeyId?: number;
  oneTimePreKeyPublic?: string;
};

type SerializedPreKey = {
  record: PreKeyRecord;
  secret: string;
};

type RecoveryPayload = {
  identity: IdentityRecord;
  identitySecret: string;
  preKeys: SerializedPreKey[];
};

type SerializedRecoveryKit = {
  metadata: RecoveryKitMetadata;
  payload: RecoveryPayload;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const signalStore = new RealmSignalProtocolStore();
let readyPromise: Promise<void> | undefined;

async function ensureReady(): Promise<void> {
  if (!readyPromise) {
    readyPromise = (async () => {
      await signalStore.hydrate();
      await hydrateStoreWithSessions(signalStore);
    })();
  }
  await readyPromise;
}

function serializeKeyPair(keyPair: KeyPairType): Uint8Array {
  return new Uint8Array([
    ...new Uint8Array(keyPair.privKey),
    ...new Uint8Array(keyPair.pubKey)
  ]);
}

function asArrayBuffer(data: Uint8Array): ArrayBuffer {
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
}

function deserializeKeyPair(serialized: Uint8Array): KeyPairType {
  const priv = serialized.slice(0, 32);
  const pub = serialized.slice(32);
  return {
    privKey: asArrayBuffer(priv),
    pubKey: asArrayBuffer(pub)
  } as KeyPairType;
}

function computeFingerprint(pubKey: ArrayBuffer): string {
  const hash = createHash('sha256');
  hash.update(Buffer.from(pubKey));
  return hash.digest('base64').slice(0, 32);
}

function binaryToUint8Array(binary: string): Uint8Array {
  const view = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    view[i] = binary.charCodeAt(i) & 0xff;
  }
  return view;
}

function uint8ArrayToBinary(data: Uint8Array): string {
  let result = '';
  for (let i = 0; i < data.length; i += 1) {
    result += String.fromCharCode(data[i]);
  }
  return result;
}

export async function createIdentity(): Promise<{ pub: string; privRef: string; fingerprint: string }> {
  await ensureReady();
  const keyPair = await KeyHelper.generateIdentityKeyPair();
  const registrationId = await KeyHelper.generateRegistrationId();
  const privRef = `ik_${ulid()}`;
  const pubKeyB64 = toBase64(new Uint8Array(keyPair.pubKey));
  const fingerprint = computeFingerprint(keyPair.pubKey);
  const identityRecord: IdentityRecord = {
    id: 'identity',
    publicKey: pubKeyB64,
    privateKeyRef: privRef,
    fingerprint,
    registrationId,
    createdAt: now(),
    updatedAt: now()
  };
  await signalStore.createIdentity(identityRecord, keyPair, serializeKeyPair(keyPair));
  return { pub: pubKeyB64, privRef, fingerprint };
}

async function ensureIdentity(): Promise<{ keyPair: KeyPairType; registrationId: number; fingerprint: string }> {
  await ensureReady();
  const keyPair = await signalStore.getIdentityKeyPair();
  const registrationId = await signalStore.getLocalRegistrationId();
  if (!keyPair || !registrationId) {
    throw new Error('identity not initialised');
  }
  const fingerprint = computeFingerprint(keyPair.pubKey);
  return { keyPair, registrationId, fingerprint };
}

export async function createPreKeys(n: number): Promise<PreKeyBundle[]> {
  const { keyPair, registrationId } = await ensureIdentity();
  const bundles: PreKeyBundle[] = [];
  const signedPreKeyId = Math.floor(Math.random() * 1_000_000);
  const signedPreKey = await KeyHelper.generateSignedPreKey(keyPair, signedPreKeyId);
  const signedRecord: PreKeyRecord = {
    id: ulid(),
    keyId: signedPreKey.keyId,
    type: 'signed',
    publicKey: toBase64(new Uint8Array(signedPreKey.keyPair.pubKey)),
    privateKeyRef: `spk_${ulid()}`,
    createdAt: now()
  };
  await signalStore.storePreKeyRecord(signedRecord, signedPreKey.keyPair, serializeKeyPair(signedPreKey.keyPair));
  const baseBundle: PreKeyBundle = {
    registrationId,
    identityKey: toBase64(new Uint8Array(keyPair.pubKey)),
    preKeyId: signedPreKey.keyId,
    preKeyPublic: toBase64(new Uint8Array(signedPreKey.keyPair.pubKey)),
    signedPreKeyId: signedPreKey.keyId,
    signedPreKeyPublic: toBase64(new Uint8Array(signedPreKey.keyPair.pubKey)),
    signedPreKeySignature: toBase64(new Uint8Array(signedPreKey.signature))
  };
  bundles.push(baseBundle);

  const startId = Math.floor(Math.random() * 1_000_000);
  for (let i = 0; i < n; i += 1) {
    const preKey = await KeyHelper.generatePreKey(startId + i + 1);
    const record: PreKeyRecord = {
      id: ulid(),
      keyId: preKey.keyId,
      type: 'one-time',
      publicKey: toBase64(new Uint8Array(preKey.keyPair.pubKey)),
      privateKeyRef: `opk_${ulid()}`,
      createdAt: now()
    };
    await signalStore.storePreKeyRecord(record, preKey.keyPair, serializeKeyPair(preKey.keyPair));
    bundles.push({
      ...baseBundle,
      oneTimePreKeyId: preKey.keyId,
      oneTimePreKeyPublic: toBase64(new Uint8Array(preKey.keyPair.pubKey))
    });
  }

  return bundles;
}

export async function exportRecoveryKit(passphrase: string): Promise<Uint8Array> {
  await ensureReady();
  const identity = await repo.getIdentity();
  if (!identity) {
    throw new Error('identity not initialised');
  }
  const identitySecret = await loadSecret(identity.privateKeyRef);
  if (!identitySecret) {
    throw new Error('identity secret missing');
  }
  const storedPreKeys = await repo.prekeys.listAll();
  const preKeys: SerializedPreKey[] = [];
  for (const record of storedPreKeys) {
    const secret = await loadSecret(record.privateKeyRef);
    if (!secret) {
      throw new Error(`missing prekey secret: ${record.keyId}`);
    }
    preKeys.push({
      record,
      secret: toBase64(secret)
    });
  }

  const metadata: RecoveryKitMetadata = {
    createdAt: now(),
    version: 1,
    fingerprint: identity.fingerprint,
    preKeyCount: preKeys.length
  };

  const payload: RecoveryPayload = {
    identity,
    identitySecret: toBase64(identitySecret),
    preKeys
  };

  const serialized: SerializedRecoveryKit = { metadata, payload };
  const encoded = encoder.encode(JSON.stringify(serialized));
  return seal(passphrase, encoded);
}

export async function importRecoveryKit(blob: Uint8Array, passphrase: string): Promise<void> {
  await ensureReady();
  const opened = await open(passphrase, blob);
  const parsed = JSON.parse(decoder.decode(opened)) as SerializedRecoveryKit;
  if (!parsed?.payload?.identity || !parsed.payload.identitySecret) {
    throw new Error('invalid recovery kit');
  }

  await signalStore.deleteIdentity();
  await signalStore.clearPreKeys();

  const contacts = await repo.contacts.all();
  for (const contact of contacts) {
    const address = new SignalProtocolAddress(contact.publicKey, 1);
    await removeStoredSession(address);
    await signalStore.removeSession(address.toString());
  }

  const identitySecret = fromBase64(parsed.payload.identitySecret);
  const identityKeyPair = deserializeKeyPair(identitySecret);
  const identityRecord: IdentityRecord = {
    ...parsed.payload.identity,
    id: 'identity',
    createdAt: parsed.payload.identity.createdAt ?? now(),
    updatedAt: now()
  };

  await signalStore.createIdentity(identityRecord, identityKeyPair, identitySecret);

  for (const entry of parsed.payload.preKeys ?? []) {
    const data = fromBase64(entry.secret);
    await signalStore.storePreKeyRecord(
      {
        ...entry.record,
        id: entry.record.id ?? ulid(),
        createdAt: entry.record.createdAt ?? now()
      },
      deserializeKeyPair(data),
      data
    );
  }

  readyPromise = undefined;
  await ensureReady();
}

async function sessionAddress(peerPub: string): Promise<SignalProtocolAddress> {
  return new SignalProtocolAddress(peerPub, 1);
}

export async function ensureSession(peerPub: string): Promise<void> {
  await ensureIdentity();
  await ensureReady();
  const address = await sessionAddress(peerPub);
  if (await signalStore.containsSession(address)) {
    return;
  }
  const bundleRecord = await repo.contacts.getByPub(peerPub);
  if (!bundleRecord) {
    throw new Error('contact missing bundle');
  }
  if (!bundleRecord.preKey) {
    throw new Error('contact missing prekey bundle');
  }
  const builder = new SessionBuilder(signalStore, address);
  const device: DeviceType = {
    identityKey: asArrayBuffer(fromBase64(bundleRecord.publicKey)),
    signedPreKey: {
      keyId: bundleRecord.preKey.signedPreKeyId,
      publicKey: asArrayBuffer(fromBase64(bundleRecord.preKey.signedPreKey)),
      signature: asArrayBuffer(fromBase64(bundleRecord.preKey.signedPreKeySignature))
    },
    registrationId: bundleRecord.identityRegistrationId ?? undefined
  };
  if (bundleRecord.preKey.oneTimePreKeyId && bundleRecord.preKey.oneTimePreKey) {
    device.preKey = {
      keyId: bundleRecord.preKey.oneTimePreKeyId,
      publicKey: asArrayBuffer(fromBase64(bundleRecord.preKey.oneTimePreKey))
    };
  }
  await builder.processPreKey(device);
}

export async function encryptFor(peerPub: string, msg: Uint8Array): Promise<{ id: string; ivB64: string; ctB64: string }> {
  await ensureIdentity();
  await ensureSession(peerPub);
  const address = await sessionAddress(peerPub);
  const cipher = new SessionCipher(signalStore, address);
  const message = await cipher.encrypt(asArrayBuffer(msg));
  if (!message.body) {
    throw new Error('missing encrypted body');
  }
  const payload = binaryToUint8Array(message.body);
  const ivMarker = new Uint8Array([message.type]);
  const sessionState = await signalStore.loadSession(address.toString());
  if (sessionState) {
    await persistSession(address, sessionState);
  }
  return { id: ulid(), ivB64: toBase64(ivMarker), ctB64: toBase64(payload) };
}

export async function decryptFrom(peerPub: string, env: { ivB64: string; ctB64: string }): Promise<Uint8Array> {
  await ensureSession(peerPub);
  const address = await sessionAddress(peerPub);
  const cipher = new SessionCipher(signalStore, address);
  const typeMarker = fromBase64(env.ivB64);
  const payload = fromBase64(env.ctB64);
  const payloadBinary = uint8ArrayToBinary(payload);
  let plaintext: ArrayBuffer;
  if (typeMarker[0] === EncryptionResultMessageType.PreKeyWhisperMessage) {
    plaintext = await cipher.decryptPreKeyWhisperMessage(payloadBinary, 'binary');
  } else {
    plaintext = await cipher.decryptWhisperMessage(payloadBinary, 'binary');
  }
  const sessionState = await signalStore.loadSession(address.toString());
  if (sessionState) {
    await persistSession(address, sessionState);
  }
  return new Uint8Array(plaintext);
}
