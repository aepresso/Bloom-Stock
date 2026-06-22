// Shared search input for Orders and Archive (SPEC §5.2 / §5.6).

import { StyleSheet, TextInput } from 'react-native';

import { fontSize, palette, radius, spacing, typography } from '@/lib/theme';

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search name, phone, or @handle…',
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}) {
  return (
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={palette.textSecondary}
      autoCapitalize="none"
      autoCorrect={false}
      clearButtonMode="while-editing"
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: typography.body,
    fontSize: fontSize.body,
    color: palette.textPrimary,
    marginBottom: spacing.md,
  },
});
