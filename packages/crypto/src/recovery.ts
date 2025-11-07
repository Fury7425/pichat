import { randomBytes } from 'crypto';
import { argon2id } from 'argon2-browser';
import { XChaCha20Poly1305 } from '@stablelib/xchacha20poly1305';

const ARGON_MEMORY = 64 * 1024;
const ARGON_ITERATIONS = 3;
const ARGON_PARALLELISM = 1;
const VERSION = 1;
const SALT_LENGTH = 16;
const NONCE_LENGTH = 24;

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<Uint8Array> {
  const result = await argon2id({
    pass: passphrase,
    salt,
    time: ARGON_ITERATIONS,
    mem: ARGON_MEMORY,
    parallelism: ARGON_PARALLELISM,
    hashLen: 32,
    raw: true
  });
  return new Uint8Array(result.hash);
}

export async function seal(passphrase: string, payload: Uint8Array): Promise<Uint8Array> {
  const salt = new Uint8Array(randomBytes(SALT_LENGTH));
  const nonce = new Uint8Array(randomBytes(NONCE_LENGTH));
  const key = await deriveKey(passphrase, salt);
  const cipher = new XChaCha20Poly1305(key);
  const sealed = cipher.seal(nonce, payload);
  const result = new Uint8Array(1 + SALT_LENGTH + NONCE_LENGTH + sealed.length);
  result[0] = VERSION;
  result.set(salt, 1);
  result.set(nonce, 1 + SALT_LENGTH);
  result.set(sealed, 1 + SALT_LENGTH + NONCE_LENGTH);
  return result;
}

export async function open(passphrase: string, blob: Uint8Array): Promise<Uint8Array> {
  if (blob.length < 1 + SALT_LENGTH + NONCE_LENGTH) {
    throw new Error('invalid recovery blob');
  }
  const version = blob[0];
  if (version !== VERSION) {
    throw new Error(`unsupported recovery version: ${version}`);
  }
  const salt = blob.slice(1, 1 + SALT_LENGTH);
  const nonce = blob.slice(1 + SALT_LENGTH, 1 + SALT_LENGTH + NONCE_LENGTH);
  const ciphertext = blob.slice(1 + SALT_LENGTH + NONCE_LENGTH);
  const key = await deriveKey(passphrase, salt);
  const cipher = new XChaCha20Poly1305(key);
  return cipher.open(nonce, ciphertext);
}
