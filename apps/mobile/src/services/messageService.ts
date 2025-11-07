import { publish, subscribe, topicForPeers } from '@pichat/network';
import { repo } from '@pichat/storage';
import { MessageEnvelope } from '@pichat/types';
import { now } from '@pichat/utils';
import { cryptoClient } from './cryptoClient';
import { encodeEnvelope, decodeEnvelope } from '../utils/codecs';
import { useStore } from '../state/store';

export async function sendMessage(conversationId: string, peerPublicKey: string, plaintext: string): Promise<MessageEnvelope> {
  const identity = useStore.getState().identity;
  if (!identity) {
    throw new Error('identity missing');
  }
  await cryptoClient.ensureSession(peerPublicKey);
  const encrypted = await cryptoClient.encryptFor(peerPublicKey, new TextEncoder().encode(plaintext));
  const envelope: MessageEnvelope = {
    id: encrypted.id,
    conversationId,
    senderPublicKey: identity.publicKey,
    cipherTextB64: encrypted.ctB64,
    ivB64: encrypted.ivB64,
    sentAt: now(),
    status: 'pending'
  };
  await repo.messages.addCipher(envelope);
  const topic = topicForPeers(identity.publicKey, peerPublicKey);
  await publish(topic, encodeEnvelope(envelope));
  const stored = await repo.messages.addPlainDecrypted({ ...envelope, decryptedText: plaintext, status: 'sent' });
  useStore.getState().appendMessage(conversationId, stored);
  return stored;
}

export async function hydrateConversation(conversationId: string): Promise<void> {
  const messages = await repo.messages.byConversation(conversationId);
  useStore.getState().replaceMessages(conversationId, messages);
}

export async function observeConversation(
  conversationId: string,
  peerPublicKey: string,
  onMessage: (message: MessageEnvelope) => void
): Promise<() => void> {
  const identity = useStore.getState().identity;
  if (!identity) {
    throw new Error('identity missing');
  }
  const topic = topicForPeers(identity.publicKey, peerPublicKey);
  const unsubscribe = await subscribe(topic, async (payload) => {
    const envelope = decodeEnvelope(payload);
    if (envelope.senderPublicKey === identity.publicKey) {
      return;
    }
    const plaintextBytes = await cryptoClient.decryptFrom(peerPublicKey, {
      ivB64: envelope.ivB64,
      ctB64: envelope.cipherTextB64
    });
    const decoded = new TextDecoder().decode(plaintextBytes);
    const stored = await repo.messages.addPlainDecrypted({ ...envelope, decryptedText: decoded, status: 'received' });
    useStore.getState().appendMessage(conversationId, stored);
    onMessage(stored);
  });
  await hydrateConversation(conversationId);
  return unsubscribe;
}
