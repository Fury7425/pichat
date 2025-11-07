// Tiny E2EE: ephemeral ECDH (P-256) + AES-GCM. Not a replacement for Signal.
// API mirrors the bigger spec so you can swap implementations later.

import { ulid } from './utils';

const subtle = globalThis.crypto?.subtle;

export async function createIdentity(): Promise<{
  pubKeyB64: string;
  privKeyJwk: JsonWebKey;
  fingerprint: string;
}> {
  const kp = await subtle!.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits', 'deriveKey']
  );
  const pub = await subtle!.exportKey('raw', kp.publicKey);
  const pubKeyB64 = btoa(String.fromCharCode(...new Uint8Array(pub)));
  const privKeyJwk = (await subtle!.exportKey('jwk', kp.privateKey)) as JsonWebKey;
  const fingerprint = pubKeyB64.slice(0, 8) + '-' + pubKeyB64.slice(-8);
  return { pubKeyB64, privKeyJwk, fingerprint };
}

async function importPeer(pubKeyB64: string) {
  const raw = Uint8Array.from(atob(pubKeyB64), (c) => c.charCodeAt(0));
  return subtle!.importKey('raw', raw, { name: 'ECDH', namedCurve: 'P-256' }, true, []);
}

async function importPriv(jwk: JsonWebKey) {
  return subtle!.importKey('jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, true, [
    'deriveBits',
    'deriveKey'
  ]);
}

async function deriveAesGcmKey(priv: CryptoKey, pub: CryptoKey) {
  return subtle!.deriveKey(
    { name: 'ECDH', public: pub },
    priv,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptFor(
  myPrivJwk: JsonWebKey,
  peerPubB64: string,
  plaintext: Uint8Array
): Promise<{ id: string; ivB64: string; ctB64: string }> {
  const priv = await importPriv(myPrivJwk);
  const pub = await importPeer(peerPubB64);
  const key = await deriveAesGcmKey(priv, pub);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = (await subtle!.encrypt({ name: 'AES-GCM', iv }, key, plaintext)) as ArrayBuffer;
  return { id: ulid(), ivB64: btoa(String.fromCharCode(...iv)), ctB64: btoa(String.fromCharCode(...new Uint8Array(ct))) };
}

export async function decryptFrom(
  myPrivJwk: JsonWebKey,
  peerPubB64: string,
  ivB64: string,
  ctB64: string
): Promise<Uint8Array> {
  const priv = await importPriv(myPrivJwk);
  const pub = await importPeer(peerPubB64);
  const key = await deriveAesGcmKey(priv, pub);
  const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
  const ct = Uint8Array.from(atob(ctB64), (c) => c.charCodeAt(0));
  const pt = (await subtle!.decrypt({ name: 'AES-GCM', iv }, key, ct)) as ArrayBuffer;
  return new Uint8Array(pt);
}
