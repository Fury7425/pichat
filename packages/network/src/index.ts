import { blake2b } from '@noble/hashes/blake2b';
import { toBase64 } from '@pichat/utils';

export async function startWaku(): Promise<void> {
  // TODO: wire js-waku (relay + store). Stub for scaffold.
  return;
}

export async function publish(topic: string, payload: Uint8Array): Promise<void> {
  console.log('[network] publish', topic, payload.length);
}

export async function subscribe(topic: string, on: (payload: Uint8Array) => void): Promise<() => void> {
  console.log('[network] subscribe', topic);
  return () => console.log('[network] unsubscribe', topic);
}

export function topicForPeers(aPub: string, bPub: string): string {
  const pair = [aPub, bPub].sort().join('|');
  const digest = blake2b(pair, { dkLen: 16 });
  return `/pichat/1/${toBase64(digest)}`;
}
