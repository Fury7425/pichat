import React, { useState } from 'react';
import { View, FlatList, TextInput } from 'react-native';
import { AppBar, Button, ChatBubble } from '@pichat/ui';
import { useStore } from '../state/store';
import { encryptFor } from '@pichat/crypto';

export const Chat = ({ route }: any) => {
  const { conversationId } = route.params;
  const [text, setText] = useState('');
  const identity = useStore((s) => s.identity);
  const conversation = useStore((s) => s.conversations.find(c => c.id === conversationId));
  const contactId = conversation?.contactId;
  const contact = useStore((s) => s.contacts.find(c => c.id === contactId));
  const messages = useStore((s) => s.messages[conversationId] ?? []);
  const addMessage = useStore((s) => s.addMessage);

  const send = async () => {
    if (!identity || !contact || !text.trim()) return;
    const env = await encryptFor(contact.publicKey, new TextEncoder().encode(text));
    addMessage(conversationId, {
      id: env.id,
      conversationId,
      senderPublicKey: identity.publicKey,
      cipherTextB64: env.ctB64,
      ivB64: env.ivB64,
      sentAt: Date.now(),
      status: 'sent',
      decryptedText: text
    });
    setText('');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0B0C0F' }}>
      <AppBar title={contact?.fingerprint ?? 'Chat'} />
      <FlatList
        contentContainerStyle={{ padding: 16 }}
        data={messages}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <ChatBubble me={item.senderPublicKey === identity?.publicKey} text={item.decryptedText ?? '[encrypted]'} />
        )}
      />
      <View style={{ flexDirection: 'row', gap: 8, padding: 12 }}>
        <TextInput
          style={{ flex: 1, borderWidth: 1, borderColor: '#2A2F3A', color: '#E6E8F0', borderRadius: 12, paddingHorizontal: 12 }}
          value={text}
          onChangeText={setText}
          placeholder="Type a message"
          placeholderTextColor="#A7B0C0"
        />
        <Button title="Send" onPress={send} />
      </View>
    </View>
  );
};
