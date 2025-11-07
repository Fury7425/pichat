import { Buffer } from 'buffer';
import { monotonicFactory } from 'ulid';
const ulidFactory = monotonicFactory();

export function ulid(): string { return ulidFactory(); }
export function toBase64(data: Uint8Array): string { return Buffer.from(data).toString('base64'); }
export function fromBase64(b64: string): Uint8Array { return new Uint8Array(Buffer.from(b64, 'base64')); }
export function now(): number { return Date.now(); }
export const MINUTE = 60 * 1000; export const HOUR = 60 * MINUTE; export const DAY = 24 * HOUR;
