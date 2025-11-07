import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaView, View, Text, FlatList } from 'react-native';
import { AppBar, Button, ChatBubble, Input } from './ui';
import { T } from './theme/tokens';
import { createIdentity } from './miniCrypto';
import { useStore } from './store';

export default function App() {
  const { me, setMe, addPeer, send, messages } = useStore();
  const [peer, setPeer] = useState('');
  const [text, setText] = useState('');
  const convRef = useRef<ReturnType<typeof addPeer> | null>(null);

  // Onboarding: create identity once
  useEffect(() => {
    (async () => {
      if (!me) setMe(await createIdentity());
    })();
  }, [me, setMe]);

  const fingerprint = me?.fingerprint ?? '…';
  const myLink = useMemo(() => (me ? `pichat://pub/${me.pubKeyB64}` : ''), [me]);

  const ensureConv = () => {
    if (!convRef.current) convRef.current = addPeer(peer);
    return convRef.current;
  };

  const onSend = async () => {
    if (!text.trim() || !peer) return;
    const c = ensureConv();
    await send(c, text.trim());
    setText('');
  };

  // “Receive” demo: paste `iv.ct` here to decrypt as if arriving from network
  const [incoming, setIncoming] = useState('');
  const onReceive = async () => {
    if (!incoming || !peer) return;
    const [iv, ct] = incoming.split('.');
    if (!iv || !ct) return;
    const c = ensureConv();
    await useStore.getState().receive(c, iv, ct);
    setIncoming('');
  };

  const convId = convRef.current?.id ?? '';
  const list = messages[convId] || [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg.page }}>
      <AppBar title="PiChat-mini" />
      <View style={{ padding: T.pad }}>
        <Text style={{ color: T.text.secondary, marginBottom: 8 }}>
          Fingerprint: <Text style={{ color: T.text.primary }}>{fingerprint}</Text>
        </Text>
        <Text style={{ color: T.text.secondary, marginBottom: 8 }}>
          Share link: <Text selectable style={{ color: T.text.primary }}>{myLink}</Text>
        </Text>

        <Input
          placeholder="Paste peer pubKeyB64 (from their link)"
          value={peer}
          onChangeText={setPeer}
        />
        <Button title="Start chat" onPress={ensureConv} />

        <View style={{ height: 12 }} />

        <FlatList
          data={list}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => (
            <ChatBubble me={item.sender === 'me'} text={item.plaintext ?? '…'} />
          )}
          style={{ flexGrow: 0, maxHeight: 280 }}
        />

        <Input placeholder="Type message…" value={text} onChangeText={setText} />
        <Button title="Encrypt & send (demo)" onPress={onSend} />

        <View style={{ height: 12 }} />

        <Input
          placeholder="Paste incoming (iv.ct) to decrypt"
          value={incoming}
          onChangeText={setIncoming}
        />
        <Button title="Decrypt incoming" onPress={onReceive} />
      </View>
    </SafeAreaView>
  );
}
