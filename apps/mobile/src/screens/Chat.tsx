import React, { useEffect, useMemo, useState } from 'react';
import { View, FlatList, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { AppBar, Button, ChatBubble } from '@pichat/ui';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../navigation';
import { useStore } from '../state/store';
import { sendMessage, observeConversation } from '../services/messageService';
import { useLogger } from '../utils/logger';
import { formatTime } from '../utils/time';
import { useSession } from '../hooks/useSession';

export const Chat = (): React.ReactElement => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, 'Chat'>>();
  const { conversationId } = route.params;
  const [draft, setDraft] = useState('');
  const messages = useStore((state) => state.messages[conversationId] ?? []);
  const conversations = useStore((state) => state.conversations);
  const contacts = useStore((state) => state.contacts);
  const identity = useStore((state) => state.identity);
  const logger = useLogger('Chat');

  const conversation = useMemo(() => conversations.find((c) => c.id === conversationId), [conversations, conversationId]);
  const peerContact = useMemo(
    () => (conversation ? contacts.find((c) => c.id === conversation.contactId) : undefined),
    [contacts, conversation]
  );

  useSession(peerContact?.publicKey);

  useEffect(() => {
    if (!peerContact) {
      return;
    }
    let unsubscribe: (() => void) | undefined;
    observeConversation(conversationId, peerContact.publicKey, () => undefined)
      .then((fn) => {
        unsubscribe = fn;
      })
      .catch((error) => logger.error('observeConversation failed', error));
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [conversationId, peerContact, logger]);

  if (!conversation || !peerContact) {
    return <View style={{ flex: 1, backgroundColor: '#05060A' }} />;
  }

  const handleSend = async () => {
    if (!draft.trim()) {
      return;
    }
    try {
      await sendMessage(conversationId, peerContact.publicKey, draft.trim());
      setDraft('');
    } catch (error) {
      logger.error('Failed to send message', error);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#05060A' }}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <AppBar title={peerContact.alias ?? peerContact.fingerprint} right={<Button title="Back" variant="secondary" onPress={() => navigation.goBack()} />} />
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 24 }}
        renderItem={({ item }) => (
          <ChatBubble
            me={item.senderPublicKey === identity?.publicKey}
            text={item.decryptedText ?? '[secure message]'}
            timestamp={formatTime(item.sentAt)}
          />
        )}
      />
      <View style={{ flexDirection: 'row', gap: 8, padding: 16, borderTopWidth: 1, borderTopColor: '#272D3A' }}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Type a secure message"
          placeholderTextColor="#8792B0"
          style={{ flex: 1, color: '#F4F6FF' }}
        />
        <Button title="Send" onPress={handleSend} variant="primary" />
      </View>
    </KeyboardAvoidingView>
  );
};
