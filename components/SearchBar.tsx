// Shared search input for Orders and Archive (SPEC §5.2 / §5.6).

import { StyleSheet, TextInput } from 'react-native';

import { fontSize, radius, spacing, typography, type ThemeTokens } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search name, phone, or @handle…',
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}) {
  const theme = useTheme();
  const styles = createStyles(theme);
  return (
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.textSecondary}
      autoCapitalize="none"
      autoCorrect={false}
      clearButtonMode="while-editing"
    />
  );
}

function createStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    input: {
      backgroundColor: theme.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      fontFamily: typography.body,
      fontSize: fontSize.body,
      color: theme.textPrimary,
      marginBottom: spacing.md,
    },
  });
}
