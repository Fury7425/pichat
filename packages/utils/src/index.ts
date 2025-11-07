import { Buffer } from 'buffer';
import { createHash } from 'crypto';
import { monotonicFactory } from 'ulid';

const ulidFactory = monotonicFactory();

export function ulid(): string {
  return ulidFactory();
}

export function now(): number {
  return Date.now();
}

export const MINUTE = 60 * 1000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export function toBase64(data: Uint8Array | ArrayBuffer): string {
  const buf = data instanceof Uint8Array ? Buffer.from(data) : Buffer.from(data);
  return buf.toString('base64');
}

export function fromBase64(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

export function toHex(data: Uint8Array): string {
  return Buffer.from(data).toString('hex');
}

export function fromHex(hex: string): Uint8Array {
  return new Uint8Array(Buffer.from(hex, 'hex'));
}

export function sha256(data: Uint8Array | string): Uint8Array {
  const hash = createHash('sha256');
  hash.update(data);
  return new Uint8Array(hash.digest());
}

export function combineStable<T>(a: T, b: T): [T, T] {
  return a <= b ? [a, b] : [b, a];
}

export function hashTopic(aPub: string, bPub: string): string {
  const [a, b] = combineStable(aPub, bPub);
  const digest = sha256(new TextEncoder().encode(`${a}|${b}`));
  return `/pichat/1/${toBase64(digest)}`;
}

export async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    result.push(items.slice(i, i + chunkSize));
  }
  return result;
}

export const redact = (label: string) => `‹${label}›`;
