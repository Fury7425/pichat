import { ulid, toBase64, fromBase64 } from '@pichat/utils';

export async function createIdentity(): Promise<{ pub: string; privRef: string; fingerprint: string }> {
  const pub = toBase64(crypto.getRandomValues(new Uint8Array(32)));
  const privRef = 'kref_' + ulid();
  const fingerprint = pub.slice(0, 16);
  return { pub, privRef, fingerprint };
}

export type PreKeyBundle = Record<string, unknown>;

export async function createPreKeys(n: number): Promise<PreKeyBundle[]> {
  return Array.from({ length: n }).map((_, i) => ({ keyId: i + 1 }));
}

export async function exportRecoveryKit(passphrase: string): Promise<Uint8Array> {
  const msg = new TextEncoder().encode('recovery:' + passphrase);
  return msg;
}

export async function importRecoveryKit(blob: Uint8Array, passphrase: string): Promise<void> {
  void blob; void passphrase;
}

export async function ensureSession(peerPub: string): Promise<void> { void peerPub; }

export async function encryptFor(peerPub: string, msg: Uint8Array): Promise<{ id:string; ivB64:string; ctB64:string }> {
  void peerPub;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = msg;
  return { id: ulid(), ivB64: toBase64(iv), ctB64: toBase64(ct) };
}

export async function decryptFrom(peerPub: string, env:{ ivB64:string; ctB64:string }): Promise<Uint8Array> {
  void peerPub; void env;
  return fromBase64(env.ctB64);
}
