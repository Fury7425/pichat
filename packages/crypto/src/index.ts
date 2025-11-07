import { createHash } from 'crypto';
import {
  KeyHelper,
  SessionBuilder,
  SessionCipher,
  SignalProtocolAddress,
  PreKeyBundle as SignalPreKeyBundle,
  KeyPairType
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
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
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
  const keyPair = signalStore.getIdentityKeyPair();
  const registrationId = signalStore.getLocalRegistrationId();
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
    preKeyPublic: toBase64(new Uint8Array(signedPreKey.keyPair.pubKey)),
    signedPreKeyId: signedPreKey.keyId,
    signedPreKeyPublic: toBase64(new Uint8Array(signedPreKey.keyPair.pubKey)),
    signedPreKeySignature: toBase64(new Uint8Array(signedPreKey.signature))
  });

  const baseId = Math.floor(Math.random() * 1_000_000);
  for (let i = 0; i < n; i += 1) {
    const preKeyId = baseId + i + 1;
    const preKey = await KeyHelper.generatePreKey(preKeyId);
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
      registrationId,
      identityKey: toBase64(new Uint8Array(keyPair.pubKey)),
      preKeyId: preKey.keyId,
      preKeyPublic: toBase64(new Uint8Array(preKey.keyPair.pubKey)),
      signedPreKeyId: signedPreKey.keyId,
      signedPreKeyPublic: toBase64(new Uint8Array(signedPreKey.keyPair.pubKey)),
      signedPreKeySignature: toBase64(new Uint8Array(signedPreKey.signature)),
      oneTimePreKeyId: preKey.keyId,
      oneTimePreKeyPublic: toBase64(new Uint8Array(preKey.keyPair.pubKey))
    });
  }

  return bundles;
}

export async function exportRecoveryKit(passphrase: string): Promise<Uint8Array> {
  const { keyPair, registrationId, fingerprint } = await ensureIdentity();
  const identitySecret = serializeKeyPair(keyPair);
  const preKeys = await repo.prekeys.listAll();
  const serializedPreKeys = (
    await Promise.all(
      preKeys.map(async (record) => {
        const secret = await loadSecret(record.privateKeyRef);
        if (!secret) {
          return undefined;
        }
        return {
          record,
          secret: toBase64(secret)
        };
      })
    )
  ).filter((entry): entry is { record: PreKeyRecord; secret: string } => Boolean(entry));
  const payload = JSON.stringify({
    registrationId,
    fingerprint,
    identitySecret: toBase64(identitySecret),
    preKeys: serializedPreKeys
  });
  return seal(passphrase, new TextEncoder().encode(payload));
}

export async function importRecoveryKit(blob: Uint8Array, passphrase: string): Promise<void> {
  await ensureReady();
  const opened = await open(passphrase, blob);
  const parsed = JSON.parse(new TextDecoder().decode(opened)) as {
    registrationId: number;
    fingerprint: string;
    identitySecret: string;
    preKeys?: { record: PreKeyRecord; secret: string }[];
  };
  const privRef = `ik_${ulid()}`;
  const serialized = fromBase64(parsed.identitySecret);
  const identityKeyPair = deserializeKeyPair(serialized);
  const record: IdentityRecord = {
    id: 'identity',
    publicKey: toBase64(serialized.slice(32)),
    privateKeyRef: privRef,
    fingerprint: parsed.fingerprint,
    registrationId: parsed.registrationId,
    createdAt: now(),
    updatedAt: now()
  };
  await signalStore.deleteIdentity();
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
  if (signalStore.containsSession(address)) {
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
  const bundle: SignalPreKeyBundle = {
    registrationId: bundleRecord.identityRegistrationId ?? 0,
    identityKey: asArrayBuffer(fromBase64(bundleRecord.publicKey)),
    preKeyId: bundleRecord.preKey.oneTimePreKeyId ?? bundleRecord.preKey.signedPreKeyId,
    preKeyPublic: asArrayBuffer(
      bundleRecord.preKey.oneTimePreKey
        ? fromBase64(bundleRecord.preKey.oneTimePreKey)
        : fromBase64(bundleRecord.preKey.signedPreKey)
    ),
    signedPreKeyId: bundleRecord.preKey.signedPreKeyId,
    signedPreKeyPublic: asArrayBuffer(fromBase64(bundleRecord.preKey.signedPreKey)),
    signedPreKeySignature: asArrayBuffer(fromBase64(bundleRecord.preKey.signedPreKeySignature))
  } as SignalPreKeyBundle;
  await builder.processPreKey(bundle);
}

export async function encryptFor(peerPub: string, msg: Uint8Array): Promise<{ id: string; ivB64: string; ctB64: string }> {
  await ensureIdentity();
  await ensureSession(peerPub);
  const address = await sessionAddress(peerPub);
  const cipher = new SessionCipher(signalStore, address);
  const message = await cipher.encrypt(msg.buffer.slice(msg.byteOffset, msg.byteOffset + msg.byteLength));
  const serialized = message.serialize();
  const ivMarker = new Uint8Array([message.type]);
  const sessionState = signalStore.loadSession(address);
  if (sessionState) {
    await persistSession(address, sessionState);
  }
  return { id: ulid(), ivB64: toBase64(ivMarker), ctB64: toBase64(new Uint8Array(serialized)) };
}

export async function decryptFrom(peerPub: string, env: { ivB64: string; ctB64: string }): Promise<Uint8Array> {
  await ensureSession(peerPub);
  const address = await sessionAddress(peerPub);
  const cipher = new SessionCipher(signalStore, address);
  const typeMarker = fromBase64(env.ivB64);
  const payload = fromBase64(env.ctB64);
  let plaintext: ArrayBuffer;
  if (typeMarker[0] === 3) {
    plaintext = await cipher.decryptPreKeyWhisperMessage(payload.buffer, 'binary');
  } else {
    plaintext = await cipher.decryptWhisperMessage(payload.buffer, 'binary');
  }
  const sessionState = signalStore.loadSession(address);
  if (sessionState) {
    await persistSession(address, sessionState);
  }
  return new Uint8Array(plaintext);
}
