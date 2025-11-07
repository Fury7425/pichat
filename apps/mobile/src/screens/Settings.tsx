import React from 'react';
import { View, ScrollView, Text } from 'react-native';
import { AppBar, Button, ListItem, Switch } from '@pichat/ui';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '../state/store';

export const Settings = (): React.ReactElement => {
  const navigation = useNavigation<any>();
  const identity = useStore((state) => state.identity);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#05060A' }}>
      <AppBar title="Settings" right={<Button title="Close" variant="secondary" onPress={() => navigation.goBack()} />} />
      <View style={{ padding: 24, gap: 16 }}>
        <Text style={{ color: '#F4F6FF', fontSize: 18, fontWeight: '600' }}>Identity</Text>
        <Text style={{ color: '#B3BDD6' }}>Fingerprint: {identity?.fingerprint ?? '—'}</Text>
        <ListItem title="Export recovery kit" onPress={() => navigation.navigate('Recovery')} />
        <ListItem title="Debug console" onPress={() => navigation.navigate('Debug')} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: '#B3BDD6' }}>Dark mode</Text>
          <Switch value onValueChange={() => undefined} />
        </View>
      </View>
    </ScrollView>
  );
};
