import {
  createLightNode,
  waitForRemotePeer,
  Protocols,
  LightNode,
  IDecodedMessage
} from '@waku/sdk';
import { hashTopic } from '@pichat/utils';

let node: LightNode | undefined;
let starting: Promise<void> | undefined;
const observers = new Map<string, Set<(payload: Uint8Array) => void>>();
const decoders = new Map<string, ReturnType<LightNode['createDecoder']>>();
const activeSubscriptions = new Set<string>();

async function ensureNode(): Promise<LightNode> {
  if (node) {
    return node;
  }
  if (!starting) {
    starting = (async () => {
      node = await createLightNode({ defaultBootstrap: true });
      await node.start();
      await waitForRemotePeer(node, [Protocols.Filter, Protocols.LightPush, Protocols.Store]);
      for (const [topic, callbacks] of observers.entries()) {
        if (callbacks.size > 0 && node) {
          await subscribeOnNode(node, topic, callbacks);
        }
      }
    })();
  }
  await starting;
  if (!node) {
    throw new Error('waku node failed to initialise');
  }
  return node;
}

async function dispatchToCallbacks(
  callbacks: Set<(payload: Uint8Array) => void>,
  payload: Uint8Array
): Promise<void> {
  for (const callback of callbacks) {
    callback(payload);
  }
}

async function fetchHistory(
  currentNode: LightNode,
  topic: string,
  callbacks: Set<(payload: Uint8Array) => void>,
  decoder: ReturnType<LightNode['createDecoder']>
): Promise<void> {
  if (!currentNode.store || callbacks.size === 0) {
    return;
  }
  for await (const batch of currentNode.store.queryGenerator([decoder], { paginationLimit: 50 })) {
    const messages = await Promise.all(batch);
    for (const message of messages) {
      if (!message?.payload) {
        continue;
      }
      await dispatchToCallbacks(callbacks, message.payload);
    }
  }
}

async function subscribeOnNode(
  currentNode: LightNode,
  topic: string,
  callbacks: Set<(payload: Uint8Array) => void>
): Promise<void> {
  if (callbacks.size === 0) {
    return;
  }
  let decoder = decoders.get(topic);
  if (!decoder) {
    decoder = currentNode.createDecoder({ contentTopic: topic });
    decoders.set(topic, decoder);
  }
  if (currentNode.filter && !activeSubscriptions.has(topic)) {
    const success = await currentNode.filter.subscribe(decoder, (msg: IDecodedMessage) => {
      if (!msg.payload) {
        return;
      }
      for (const callback of callbacks) {
        callback(msg.payload);
      }
    });
    if (success) {
      activeSubscriptions.add(topic);
    }
  }
  await fetchHistory(currentNode, topic, callbacks, decoder);
}

async function bindSubscription(topic: string, callbacks: Set<(payload: Uint8Array) => void>): Promise<void> {
  const currentNode = await ensureNode();
  await subscribeOnNode(currentNode, topic, callbacks);
}

export async function startWaku(): Promise<void> {
  await ensureNode();
}

export async function publish(topic: string, payload: Uint8Array): Promise<void> {
  const currentNode = await ensureNode();
  const encoder = currentNode.createEncoder({ contentTopic: topic });
  const result = await currentNode.lightPush.send(encoder, { payload });
  if (result.failures.length > 0) {
    throw new Error(`failed to publish to Waku: ${result.failures[0].error}`);
  }
}

export async function subscribe(topic: string, on: (payload: Uint8Array) => void): Promise<() => void> {
  const callbacks = observers.get(topic) ?? new Set();
  callbacks.add(on);
  observers.set(topic, callbacks);
  await bindSubscription(topic, callbacks);
  return () => {
    const set = observers.get(topic);
    if (!set) {
      return;
    }
    set.delete(on);
  };
}

export function topicForPeers(aPub: string, bPub: string): string {
  return hashTopic(aPub, bPub);
}
