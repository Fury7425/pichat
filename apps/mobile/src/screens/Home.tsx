import React from 'react';
import { View, FlatList, Text } from 'react-native';
import { AppBar, Button, ListItem } from '@pichat/ui';
import { useStore } from '../state/store';
import { ulid } from '@pichat/utils';

export const Home = ({ navigation }: any) => {
  const conversations = useStore((s) => s.conversations);
  const contacts = useStore((s) => s.contacts);
  const addContact = useStore((s) => s.addContact);
  const addConversation = useStore((s) => s.addConversation);

  const addDummy = () => {
    const contactId = ulid();
    addContact({ id: contactId, publicKey: 'peer_pub', fingerprint: 'peer_fpr' });
    addConversation({ id: ulid(), contactId, topic: '/pichat/local', unreadCount: 0, createdAt: Date.now(), updatedAt: Date.now() });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0B0C0F' }}>
      <AppBar title="Conversations" right={<Button title="Add" variant="secondary" onPress={addDummy} />} />
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const contact = contacts.find((c) => c.id === item.contactId);
          return (
            <ListItem
              title={contact?.fingerprint ?? 'Unknown'}
              subtitle={item.topic}
              onPress={() => navigation.navigate('Chat', { conversationId: item.id })}
            />
          );
        }}
        ListEmptyComponent={() => <Text style={{ color: '#A7B0C0', padding: 16 }}>No conversations</Text>}
      />
    </View>
  );
};
