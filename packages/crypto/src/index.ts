import { createHash } from 'crypto';
import {
  KeyHelper,
  SessionBuilder,
  SessionCipher,
  SignalProtocolAddress,
  KeyPairType,
  DeviceType
} from 'libsignal-protocol-typescript';
import { repo } from '@pichat/storage';
import { RealmSignalProtocolStore, hydrateStoreWithSessions, persistSession } from './signalStore';
import { seal, open } from './recovery';
import { fromBase64, now, toBase64, ulid } from '@pichat/utils';
import { IdentityRecord, PreKeyRecord } from '@pichat/types';
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

function deserializeKeyPair(serialized: Uint8Array): KeyPairType {
  const priv = serialized.slice(0, 32);
  const pub = serialized.slice(32);
  return {
    privKey: priv.buffer.slice(priv.byteOffset, priv.byteOffset + priv.byteLength),
    pubKey: pub.buffer.slice(pub.byteOffset, pub.byteOffset + pub.byteLength)
  } as KeyPairType;
}

function asArrayBuffer(data: Uint8Array): ArrayBuffer {
  if (data.buffer instanceof ArrayBuffer) {
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  }
  const copy = data.slice();
  return copy.buffer;
}

function binaryStringToUint8Array(input: string): Uint8Array {
  const view = new Uint8Array(input.length);
  for (let i = 0; i < input.length; i += 1) {
    view[i] = input.charCodeAt(i) & 0xff;
  }
  return view;
}

function computeFingerprint(pubKey: ArrayBuffer): string {
  const hash = createHash('sha256');
  hash.update(Buffer.from(pubKey));
  return hash.digest('base64').slice(0, 32);
}

export async function createIdentity(): Promise<{ pub: string; privRef: string; fingerprint: string }> {
  await ensureReady();
  const keyPair = await KeyHelper.generateIdentityKeyPair();
  const registrationId = await KeyHelper.generateRegistrationId();
  const privRef = `ik_${ulid()}`;
  const serialized = serializeKeyPair(keyPair);
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
  await signalStore.createIdentity(identityRecord, keyPair, serialized);
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
  bundles.push({
    registrationId,
    identityKey: toBase64(new Uint8Array(keyPair.pubKey)),
    preKeyId: signedPreKey.keyId,
@@ -202,85 +214,90 @@ export async function importRecoveryKit(blob: Uint8Array, passphrase: string): P
  await signalStore.createIdentity(record, identityKeyPair, serialized);
  if (parsed.preKeys) {
    for (const entry of parsed.preKeys) {
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
  }
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
    preKey: bundleRecord.preKey.oneTimePreKey && bundleRecord.preKey.oneTimePreKeyId !== undefined
      ? {
          keyId: bundleRecord.preKey.oneTimePreKeyId,
          publicKey: asArrayBuffer(fromBase64(bundleRecord.preKey.oneTimePreKey))
        }
      : undefined,
    registrationId: bundleRecord.identityRegistrationId ?? undefined
  };
  await builder.processPreKey(device);
}

export async function encryptFor(peerPub: string, msg: Uint8Array): Promise<{ id: string; ivB64: string; ctB64: string }> {
  await ensureIdentity();
  await ensureSession(peerPub);
  const address = await sessionAddress(peerPub);
  const cipher = new SessionCipher(signalStore, address);
  const message = await cipher.encrypt(asArrayBuffer(msg));
  const body = message.body ? binaryStringToUint8Array(message.body) : new Uint8Array();
  const serialized = new Uint8Array(1 + body.length);
  serialized[0] = message.type;
  serialized.set(body, 1);
  const ivMarker = new Uint8Array([message.type]);
  const sessionState = await signalStore.loadSession(address.toString());
  if (sessionState) {
    await persistSession(address, sessionState);
  }
  return { id: ulid(), ivB64: toBase64(ivMarker), ctB64: toBase64(serialized) };
}

export async function decryptFrom(peerPub: string, env: { ivB64: string; ctB64: string }): Promise<Uint8Array> {
  await ensureSession(peerPub);
  const address = await sessionAddress(peerPub);
  const cipher = new SessionCipher(signalStore, address);
  const typeMarker = fromBase64(env.ivB64);
  const payload = fromBase64(env.ctB64);
  let plaintext: ArrayBuffer;
  if (typeMarker[0] === 3) {
    plaintext = await cipher.decryptPreKeyWhisperMessage(asArrayBuffer(payload));
  } else {
    plaintext = await cipher.decryptWhisperMessage(asArrayBuffer(payload));
  }
  const sessionState = await signalStore.loadSession(address.toString());
  if (sessionState) {
    await persistSession(address, sessionState);
  }
  return new Uint8Array(plaintext);
}
