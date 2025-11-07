import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useStore } from '../state/store';
import { Onboarding } from '../screens/Onboarding';
import { Home } from '../screens/Home';
import { Chat } from '../screens/Chat';
import { AddContact } from '../screens/AddContact';
import { Settings } from '../screens/Settings';
import { Recovery } from '../screens/Recovery';
import { Debug } from '../screens/Debug';

export type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  Chat: { conversationId: string };
  AddContact: undefined;
  Settings: undefined;
  Recovery: undefined;
  Debug: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = (): React.ReactElement => {
  const identity = useStore((state) => state.identity);
  const initialRoute = identity ? 'Home' : 'Onboarding';
  return (
    <Stack.Navigator key={initialRoute} initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Onboarding" component={Onboarding} />
      <Stack.Screen name="Home" component={Home} />
      <Stack.Screen name="Chat" component={Chat} />
      <Stack.Screen name="AddContact" component={AddContact} />
      <Stack.Screen name="Settings" component={Settings} />
      <Stack.Screen name="Recovery" component={Recovery} />
      <Stack.Screen name="Debug" component={Debug} />
    </Stack.Navigator>
  );
};
