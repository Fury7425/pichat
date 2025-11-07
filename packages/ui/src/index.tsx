import React from 'react';
import { Pressable, TextInput, Text, View, ViewStyle, StyleProp } from 'react-native';
import { T } from './tokens';

export const AppBar = ({ title, right }: { title: string; right?: React.ReactNode }) => (
  <View style={{ padding: T.pad, borderBottomWidth: 1, borderBottomColor: T.border, backgroundColor: T.bg.surface }}>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Text style={{ color: T.text.primary, fontSize: 20, fontWeight: '600', flex: 1 }}>{title}</Text>
      {right}
    </View>
  </View>
);

export const Button = ({ title, onPress, variant='primary', style }:
  { title: string; onPress?: () => void; variant?: 'primary'|'secondary'; style?: StyleProp<ViewStyle> }) => (
  <Pressable
    onPress={onPress}
    style={[{
      backgroundColor: variant==='primary'? T.brand : T.bg.surface,
      padding: T.pad, borderRadius: T.radius, alignItems: 'center', marginTop: 8, borderWidth: variant==='primary'?0:1, borderColor: T.border
    }, style]}
  >
    <Text style={{ color: variant==='primary' ? 'white' : T.text.primary, fontWeight: '700' }}>{title}</Text>
  </Pressable>
);

export const Input = (p: React.ComponentProps<typeof TextInput>) => (
  <TextInput
    placeholderTextColor={T.text.secondary}
    {...p}
    style={{
      color: T.text.primary, borderColor: T.border, borderWidth: 1, borderRadius: T.radius, padding: T.pad, backgroundColor: T.bg.surface
    }}
  />
);

export const ChatBubble = ({ me, text }: { me?: boolean; text: string }) => (
  <View
    style={{ alignSelf: me ? 'flex-end' : 'flex-start', backgroundColor: me ? T.brand : T.bg.surface,
             padding: T.pad, borderRadius: T.radius, marginVertical: 4, maxWidth: '80%' }}
  >
    <Text style={{ color: me ? 'white' : T.text.primary }}>{text}</Text>
  </View>
);

export const ListItem = ({ title, subtitle, onPress }:
  { title: string; subtitle?: string; onPress?: () => void }) => (
  <Pressable onPress={onPress} style={{ padding: T.pad, borderBottomWidth: 1, borderBottomColor: T.border }}>
    <Text style={{ color: T.text.primary, fontWeight: '600' }}>{title}</Text>
    {subtitle ? <Text style={{ color: T.text.secondary, marginTop: 2 }}>{subtitle}</Text> : null}
  </Pressable>
);

export const Toast = ({ message }: { message: string }) => (
  <View style={{ backgroundColor: T.brand, padding: T.pad, borderRadius: T.radius, alignSelf: 'center', marginTop: T.pad }}>
    <Text style={{ color: 'white', fontWeight: '700' }}>{message}</Text>
  </View>
);

export const QRCard = ({ value, label }:{ value: string; label?: string }) => (
  <View style={{ borderWidth: 1, borderColor: T.border, borderRadius: T.radius, padding: T.pad, alignItems: 'center' }}>
    <Text selectable style={{ color: T.text.primary }}>{value}</Text>
    {label ? <Text style={{ color: T.text.secondary, marginTop: 4 }}>{label}</Text> : null}
  </View>
);
