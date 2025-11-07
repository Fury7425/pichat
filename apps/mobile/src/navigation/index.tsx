import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Onboarding } from '../screens/Onboarding';
import { Home } from '../screens/Home';
import { Chat } from '../screens/Chat';

export type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  Chat: { conversationId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = (): React.ReactElement => (
  <Stack.Navigator initialRouteName="Onboarding" screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Onboarding" component={Onboarding} />
    <Stack.Screen name="Home" component={Home} />
    <Stack.Screen name="Chat" component={Chat} />
  </Stack.Navigator>
);
