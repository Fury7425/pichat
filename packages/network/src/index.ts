import {
  createLightNode,
  waitForRemotePeer,
  Protocols,
  createEncoder,
  createDecoder,
  DecodedMessage,
  LightNode
} from '@waku/sdk';
import { hashTopic } from '@pichat/utils';

let node: LightNode | undefined;
let starting: Promise<void> | undefined;
const observers = new Map<string, Set<(payload: Uint8Array) => void>>();

async function ensureNode(): Promise<LightNode> {
  if (node) {
    return node;
  }
  if (!starting) {
    starting = (async () => {
      node = await createLightNode({ defaultBootstrap: true });
      await node.start();
      await waitForRemotePeer(node, [Protocols.Relay, Protocols.Store]);
      for (const [topic, callbacks] of observers.entries()) {
        await subscribeOnNode(node!, topic, callbacks);
      }
    })();
  }
  await starting;
  if (!node) {
    throw new Error('waku node failed to initialise');
  }
  return node;
}

async function subscribeOnNode(currentNode: LightNode, topic: string, callbacks: Set<(payload: Uint8Array) => void>): Promise<void> {
  const decoder = createDecoder(topic);
  await currentNode.relay.subscribe([decoder], (msg: DecodedMessage) => {
    if (!msg.payload) {
      return;
    }
    for (const callback of callbacks) {
      callback(msg.payload);
    }
  });
  // fetch store backfill
  if (currentNode.store) {
    for await (const page of currentNode.store.queryGenerator({
      decoder,
      pageSize: 50
    })) {
      for (const message of page.messages) {
        if (!message.payload) {
          continue;
        }
        for (const callback of callbacks) {
          callback(message.payload);
        }
      }
    }
  }
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
  const encoder = createEncoder({ contentTopic: topic });
  await currentNode.relay.publish(encoder, { payload });
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
