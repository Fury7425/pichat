import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { AppBar, Button, Input, QRCard } from '@pichat/ui';
import { addContact, openConversation } from '../services/contactService';
import { useNavigation } from '@react-navigation/native';
import { useLogger } from '../utils/logger';

export const AddContact = (): React.ReactElement => {
  const navigation = useNavigation<any>();
  const [publicKey, setPublicKey] = useState('');
  const [fingerprint, setFingerprint] = useState('');
  const [alias, setAlias] = useState('');
  const [preKeySigned, setPreKeySigned] = useState('');
  const [preKeySignature, setPreKeySignature] = useState('');
  const [oneTimePreKey, setOneTimePreKey] = useState('');
  const logger = useLogger('AddContact');

  const handleSave = async () => {
    try {
      const contact = await addContact({
        publicKey,
        fingerprint,
        alias,
        verificationStatus: 'unverified',
        preKey: {
          signedPreKeyId: Date.now(),
          signedPreKey: preKeySigned,
          signedPreKeySignature: preKeySignature,
          oneTimePreKeyId: oneTimePreKey ? Date.now() + 1 : undefined,
          oneTimePreKey: oneTimePreKey || undefined
        }
      });
      const conversation = await openConversation(contact.publicKey);
      navigation.replace('Chat', { conversationId: conversation.id });
    } catch (error) {
      logger.error('Failed to add contact', error);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#05060A' }}>
      <AppBar title="Add Contact" right={<Button title="Close" variant="secondary" onPress={() => navigation.goBack()} />} />
      <View style={{ padding: 24, gap: 16 }}>
        <Input placeholder="Contact public key" value={publicKey} onChangeText={setPublicKey} autoCapitalize="none" />
        <Input placeholder="Fingerprint" value={fingerprint} onChangeText={setFingerprint} autoCapitalize="none" />
        <Input placeholder="Alias" value={alias} onChangeText={setAlias} />
        <Input placeholder="Signed pre-key (base64)" value={preKeySigned} onChangeText={setPreKeySigned} autoCapitalize="none" />
        <Input placeholder="Pre-key signature (base64)" value={preKeySignature} onChangeText={setPreKeySignature} autoCapitalize="none" />
        <Input placeholder="One-time pre-key (optional base64)" value={oneTimePreKey} onChangeText={setOneTimePreKey} autoCapitalize="none" />
        <Button title="Save contact" onPress={handleSave} />
        {fingerprint ? <QRCard value={fingerprint} label="Verify with your contact" /> : null}
      </View>
    </ScrollView>
  );
};
