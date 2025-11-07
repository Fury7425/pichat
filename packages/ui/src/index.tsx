import React from 'react';
import {
  Pressable,
  TextInput,
  Text,
  View,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  Switch as RNSwitch
} from 'react-native';
import { tokens } from './tokens';

const styles = StyleSheet.create({
  appBar: {
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
    backgroundColor: tokens.color.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: tokens.color.border,
    flexDirection: 'row',
    alignItems: 'center'
  },
  title: {
    color: tokens.color.text.primary,
    fontSize: tokens.typography.sizes.lg,
    fontWeight: '600',
    flex: 1
  },
  button: {
    borderRadius: tokens.radius.md,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48
  },
  buttonLabel: {
    fontWeight: '700',
    fontSize: tokens.typography.sizes.md
  },
  input: {
    borderWidth: 1,
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    color: tokens.color.text.primary,
    backgroundColor: tokens.color.background.surface,
    fontSize: tokens.typography.sizes.md
  },
  textMuted: {
    color: tokens.color.text.secondary
  },
  bubble: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.lg,
    marginVertical: tokens.spacing.xs,
    maxWidth: '80%'
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: tokens.color.background.elevated,
    alignItems: 'center',
    justifyContent: 'center'
  },
  qrContainer: {
    borderWidth: 1,
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
    alignItems: 'center',
    backgroundColor: tokens.color.background.surface
  },
  dialog: {
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.color.background.surface,
    padding: tokens.spacing.lg,
    gap: tokens.spacing.md
  }
});

export const AppBar = ({ title, right }: { title: string; right?: React.ReactNode }) => (
  <View style={styles.appBar} accessibilityRole="header">
    <Text style={styles.title}>{title}</Text>
    {right}
  </View>
);

export const Button = ({
  title,
  onPress,
  variant = 'primary',
  disabled,
  style,
  textStyle
}: {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) => {
  const background =
    variant === 'primary'
      ? tokens.color.brand
      : variant === 'danger'
      ? tokens.color.danger
      : tokens.color.background.surface;
  const borderColor = variant === 'secondary' ? tokens.color.border : 'transparent';
  const textColor = variant === 'secondary' ? tokens.color.text.primary : '#0D0D0D';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, { backgroundColor: background, borderColor, borderWidth: 1, opacity: disabled ? 0.5 : 1 }, style]}
    >
      <Text style={[styles.buttonLabel, { color: textColor }, textStyle]}>{title}</Text>
    </Pressable>
  );
};

export const Input = ({ style, ...props }: React.ComponentProps<typeof TextInput>) => (
  <TextInput
    {...props}
    style={[styles.input, style]}
    placeholderTextColor={tokens.color.text.muted}
    accessibilityRole="text"
  />
);

export const ChatBubble = ({ me, text, timestamp }: { me?: boolean; text: string; timestamp?: string }) => (
  <View
    style={[
      styles.bubble,
      {
        alignSelf: me ? 'flex-end' : 'flex-start',
        backgroundColor: me ? tokens.color.brand : tokens.color.background.elevated
      }
    ]}
  >
    <Text style={{ color: me ? '#0D0D0D' : tokens.color.text.primary }}>{text}</Text>
    {timestamp ? (
      <Text style={[styles.textMuted, { fontSize: tokens.typography.sizes.xs, marginTop: tokens.spacing.xs }]}>{timestamp}</Text>
    ) : null}
  </View>
);

export const ConversationItem = ({
  title,
  subtitle,
  unreadCount,
  onPress
}: {
  title: string;
  subtitle?: string;
  unreadCount?: number;
  onPress?: () => void;
}) => (
  <Pressable
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: tokens.spacing.lg,
      paddingVertical: tokens.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: tokens.color.border,
      gap: tokens.spacing.md
    }}
    onPress={onPress}
  >
    <Avatar label={title} size={44} />
    <View style={{ flex: 1 }}>
      <Text style={{ color: tokens.color.text.primary, fontWeight: '600', fontSize: tokens.typography.sizes.md }}>{title}</Text>
      {subtitle ? <Text style={[styles.textMuted, { marginTop: 2 }]}>{subtitle}</Text> : null}
    </View>
    {unreadCount ? (
      <View
        style={{
          backgroundColor: tokens.color.brand,
          borderRadius: tokens.radius.lg,
          paddingHorizontal: tokens.spacing.sm,
          paddingVertical: tokens.spacing.xs,
          minWidth: 28,
          alignItems: 'center'
        }}
      >
        <Text style={{ color: '#0D0D0D', fontWeight: '700' }}>{unreadCount}</Text>
      </View>
    ) : null}
  </Pressable>
);

export const Avatar = ({ label, size = 40 }: { label: string; size?: number }) => {
  const initials = label
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2
        }
      ]}
      accessibilityLabel={`Avatar for ${label}`}
    >
      <Text style={{ color: tokens.color.text.primary, fontWeight: '600' }}>{initials}</Text>
    </View>
  );
};

export const Toast = ({ message, variant = 'info' }: { message: string; variant?: 'info' | 'success' | 'danger' }) => {
  const background =
    variant === 'success'
      ? tokens.color.success
      : variant === 'danger'
      ? tokens.color.danger
      : tokens.color.brand;
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        backgroundColor: background,
        paddingHorizontal: tokens.spacing.lg,
        paddingVertical: tokens.spacing.sm,
        borderRadius: tokens.radius.lg,
        alignSelf: 'center'
      }}
    >
      <Text style={{ color: '#0D0D0D', fontWeight: '700' }}>{message}</Text>
    </View>
  );
};

export const Dialog = ({ title, body, actions }: { title: string; body: string; actions: React.ReactNode }) => (
  <View style={styles.dialog} accessibilityRole="summary">
    <Text style={{ color: tokens.color.text.primary, fontSize: tokens.typography.sizes.lg, fontWeight: '600' }}>{title}</Text>
    <Text style={{ color: tokens.color.text.secondary }}>{body}</Text>
    <View style={{ flexDirection: 'row', gap: tokens.spacing.sm }}>{actions}</View>
  </View>
);

export const Switch = ({ value, onValueChange, label }: { value: boolean; onValueChange: (value: boolean) => void; label?: string }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.md }}>
    {label ? <Text style={{ color: tokens.color.text.primary }}>{label}</Text> : null}
    <RNSwitch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: tokens.color.text.muted, true: tokens.color.brand }}
      thumbColor={tokens.color.background.surface}
    />
  </View>
);

export const QRCard = ({ value, label }: { value: string; label?: string }) => (
  <View style={styles.qrContainer}>
    <Text selectable style={{ color: tokens.color.text.primary, fontFamily: 'Menlo', fontSize: tokens.typography.sizes.md }}>
      {value}
    </Text>
    {label ? <Text style={[styles.textMuted, { marginTop: tokens.spacing.sm }]}>{label}</Text> : null}
  </View>
);

export const ListItem = ({ title, subtitle, right, onPress }: { title: string; subtitle?: string; right?: React.ReactNode; onPress?: () => void }) => (
  <Pressable
    onPress={onPress}
    style={{
      paddingHorizontal: tokens.spacing.lg,
      paddingVertical: tokens.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: tokens.color.border,
      flexDirection: 'row',
      alignItems: 'center'
    }}
  >
    <View style={{ flex: 1 }}>
      <Text style={{ color: tokens.color.text.primary, fontWeight: '600' }}>{title}</Text>
      {subtitle ? <Text style={[styles.textMuted, { marginTop: 2 }]}>{subtitle}</Text> : null}
    </View>
    {right}
  </Pressable>
);

export { tokens } from './tokens';
