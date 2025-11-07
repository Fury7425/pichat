+40-19
import React, { useEffect } from 'react';
import { View, FlatList, Text } from 'react-native';
import { AppBar, Button, ConversationItem } from '@pichat/ui';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '../state/store';
import { listConversations } from '../services/contactService';
import { repo } from '@pichat/storage';
import { useWakuNode } from '../hooks/useWakuNode';
import { useLogger } from '../utils/logger';
import { formatTime } from '../utils/time';

export const Home = (): React.ReactElement => {
  const navigation = useNavigation<any>();
  const conversations = useStore((state) => state.conversations);
  const contacts = useStore((state) => state.contacts);
  const logger = useLogger('Home');

  useWakuNode();

  useEffect(() => {
    listConversations().catch((error) => logger.error('Failed to load conversations', error));
    repo.contacts
      .all()
      .then((all) => useStore.getState().setContacts(all))
      .catch((error) => logger.error('Failed to load contacts', error));
  }, [logger]);

  return (
    <View style={{ flex: 1, backgroundColor: '#05060A' }}>
      <AppBar
        title="Conversations"
        right={
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button title="Add" variant="secondary" onPress={() => navigation.navigate('AddContact')} />
            <Button title="Settings" variant="secondary" onPress={() => navigation.navigate('Settings')} />
          </View>
        }
      />
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 32 }}
        renderItem={({ item }) => {
          const contact = contacts.find((c) => c.id === item.contactId);
          return (
            <ConversationItem
              title={contact?.alias ?? contact?.fingerprint ?? 'Unknown'}
              subtitle={item.lastMessageAt ? formatTime(item.lastMessageAt) : undefined}
              unreadCount={item.unreadCount}
              onPress={() => navigation.navigate('Chat', { conversationId: item.id })}
            />
          );
        }}
        ListEmptyComponent={() => (
          <Text style={{ color: '#B3BDD6', padding: 24 }}>No secure conversations yet. Add a contact to get started.</Text>
        )}
      />
    </View>
  );
};
