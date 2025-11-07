import React, { useState } from 'react';
import { ScrollView, View, Text, Alert } from 'react-native';
import { AppBar, Button, Input } from '@pichat/ui';
import { exportRecovery, importRecovery } from '../services/recoveryService';
import { useLogger } from '../utils/logger';
import * as Clipboard from 'expo-clipboard';
import { toBase64 } from '@pichat/utils';

export const Recovery = ({ navigation }: { navigation: any }): React.ReactElement => {
  const [passphrase, setPassphrase] = useState('');
  const [blob, setBlob] = useState<Uint8Array | undefined>();
  const logger = useLogger('Recovery');

  const handleExport = async () => {
    try {
      const kit = await exportRecovery(passphrase);
      setBlob(kit);
      await Clipboard.setStringAsync(toBase64(kit));
      Alert.alert('Recovery kit copied to clipboard');
    } catch (error) {
      logger.error('Failed to export recovery kit', error);
    }
  };

  const handleImport = async () => {
    if (!blob) {
      return;
    }
    try {
      await importRecovery(blob, passphrase);
      Alert.alert('Recovery kit imported');
      navigation.goBack();
    } catch (error) {
      logger.error('Failed to import recovery kit', error);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#05060A' }}>
      <AppBar title="Recovery" right={<Button title="Close" variant="secondary" onPress={() => navigation.goBack()} />} />
      <View style={{ padding: 24, gap: 16 }}>
        <Text style={{ color: '#F4F6FF', fontSize: 18, fontWeight: '600' }}>Export recovery kit</Text>
        <Input placeholder="Passphrase" secureTextEntry value={passphrase} onChangeText={setPassphrase} />
        <Button title="Export" onPress={handleExport} />
        <Button title="Import" variant="secondary" onPress={handleImport} disabled={!blob} />
      </View>
    </ScrollView>
  );
};
