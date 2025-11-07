import React from 'react';
import { Pressable, TextInput, Text, View } from 'react-native';
import { T } from './theme/tokens';

export const AppBar = ({ title }: { title: string }) => (
  <View style={{ padding: T.pad, borderBottomWidth: 1, borderBottomColor: T.border }}>
    <Text style={{ color: T.text.primary, fontSize: 20, fontWeight: '600' }}>{title}</Text>
  </View>
);

export const Button = ({ title, onPress }: { title: string; onPress?: () => void }) => (
  <Pressable
    onPress={onPress}
    style={{
      backgroundColor: T.brand,
      padding: T.pad,
      borderRadius: T.radius,
      alignItems: 'center',
      marginTop: 8
    }}
  >
    <Text style={{ color: 'white', fontWeight: '700' }}>{title}</Text>
  </Pressable>
);

export const Input = (p: React.ComponentProps<typeof TextInput>) => (
  <TextInput
    placeholderTextColor={T.text.secondary}
    {...p}
    style={{
      color: T.text.primary,
      borderColor: T.border,
      borderWidth: 1,
      borderRadius: T.radius,
      padding: T.pad
    }}
  />
);

export const ChatBubble = ({ me, text }: { me?: boolean; text: string }) => (
  <View
    style={{
      alignSelf: me ? 'flex-end' : 'flex-start',
      backgroundColor: me ? T.brand : T.bg.surface,
      padding: T.pad,
      borderRadius: T.radius,
      marginVertical: 4,
      maxWidth: '80%'
    }}
  >
    <Text style={{ color: me ? 'white' : T.text.primary }}>{text}</Text>
  </View>
);
