import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { AppBar, Button, Input, QRCard } from '@pichat/ui';
import { createIdentity } from '@pichat/crypto';
import { useStore } from '../state/store';

export const Onboarding = ({ navigation }: any) => {
  const [displayName, setDisplayName] = useState('');
  const [fingerprint, setFingerprint] = useState<string | undefined>(undefined);
  const setIdentity = useStore((s) => s.setIdentity);

  const handleCreate = async () => {
    const id = await createIdentity();
    setIdentity({
      id: 'identity',
      publicKey: id.pub,
      privateKeyRef: id.privRef,
      fingerprint: id.fingerprint,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    setFingerprint(id.fingerprint);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#0B0C0F' }}>
      <AppBar title="PiChat" />
      <View style={{ padding: 16, gap: 12 }}>
        <Input placeholder="Display name" value={displayName} onChangeText={setDisplayName} />
        <Button title="Generate Identity" onPress={handleCreate} />
        {fingerprint ? <QRCard value={fingerprint} label="Your fingerprint" /> : null}
        <Button title="Continue" variant="secondary" onPress={() => navigation.replace('Home')} />
      </View>
    </ScrollView>
  );
};
