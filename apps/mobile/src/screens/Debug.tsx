import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text } from 'react-native';
import { AppBar, Button } from '@pichat/ui';
import { useNavigation } from '@react-navigation/native';
import { repo } from '@pichat/storage';

export const Debug = (): React.ReactElement => {
  const navigation = useNavigation<any>();
  const [preKeyCount, setPreKeyCount] = useState(0);
  const [conversationCount, setConversationCount] = useState(0);

  useEffect(() => {
    repo.prekeys.listAll().then((items) => setPreKeyCount(items.length));
    repo.conversations.list().then((items) => setConversationCount(items.length));
  }, []);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#05060A' }}>
      <AppBar title="Debug" right={<Button title="Close" variant="secondary" onPress={() => navigation.goBack()} />} />
      <View style={{ padding: 24, gap: 12 }}>
        <Text style={{ color: '#F4F6FF' }}>Pre-keys stored: {preKeyCount}</Text>
        <Text style={{ color: '#F4F6FF' }}>Conversations: {conversationCount}</Text>
      </View>
    </ScrollView>
  );
};
