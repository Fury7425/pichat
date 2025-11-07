export type Identity = { pubKeyB64: string; privKeyJwk: JsonWebKey; fingerprint: string };
export type Conversation = { id: string; peerPubKeyB64: string; lastMessageAt?: number };
export type Message = {
  id: string;
  conversationId: string;
  sender: 'me' | 'peer';
  ciphertextB64: string;
  sentAt: number;
  plaintext?: string; // filled client-side after decrypt
};
