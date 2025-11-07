import React, { useState } from 'react';
import { ScrollView, View, Text } from 'react-native';
import { AppBar, Button, Input, QRCard } from '@pichat/ui';
import { cryptoClient } from '../services/cryptoClient';
import { useStore } from '../state/store';
import { useLogger } from '../utils/logger';
import { repo } from '@pichat/storage';

export const Onboarding = ({ navigation }: { navigation: any }) => {
  const [displayName, setDisplayName] = useState('');
  const [fingerprint, setFingerprint] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const setIdentity = useStore((state) => state.setIdentity);
  const logger = useLogger('Onboarding');

  const handleCreate = async () => {
    try {
      setLoading(true);
      const identity = await cryptoClient.createIdentity();
      await cryptoClient.createPreKeys(10);
      const stored = await repo.getIdentity();
      if (stored) {
        setIdentity(stored);
      }
      setFingerprint(identity.fingerprint);
    } catch (error) {
      logger.error('Failed to create identity', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#05060A' }} contentContainerStyle={{ paddingBottom: 48 }}>
      <AppBar title="PiChat" />
      <View style={{ padding: 24, gap: 16 }}>
        <Text style={{ color: '#F4F6FF', fontSize: 20, fontWeight: '600' }}>Create your secure identity</Text>
        <Input placeholder="Display name" value={displayName} onChangeText={setDisplayName} autoCapitalize="words" />
        <Button title={loading ? 'Generating…' : 'Generate Identity'} disabled={loading} onPress={handleCreate} />
        {fingerprint ? (
          <View style={{ gap: 12 }}>
            <Text style={{ color: '#B3BDD6' }}>Share your fingerprint to verify with contacts.</Text>
            <QRCard value={fingerprint} label="Your fingerprint" />
            <Button title="Enter PiChat" onPress={() => navigation.replace('Home')} />
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
};
