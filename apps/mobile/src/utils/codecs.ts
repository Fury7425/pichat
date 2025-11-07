import { MessageEnvelope } from '@pichat/types';

export function encodeEnvelope(envelope: MessageEnvelope): Uint8Array {
  const json = JSON.stringify(envelope);
  return new TextEncoder().encode(json);
}

export function decodeEnvelope(payload: Uint8Array): MessageEnvelope {
  const json = new TextDecoder().decode(payload);
  return JSON.parse(json) as MessageEnvelope;
}
