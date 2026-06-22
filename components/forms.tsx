// Small shared form primitives for the New Order wizard (5.3) and Order Detail edit.
// Kept deliberately minimal/uncontrolled-friendly so both screens compose them the
// same way without a form library.

import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { createElement, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';

import { persistImage } from '@/lib/images';
import { fontSize, radius, spacing, typography, type ThemeTokens } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';

export function FieldLabel({ children }: { children: string }) {
  const styles = createStyles(useTheme());
  return <Text style={styles.label}>{children}</Text>;
}

export function TextField({
  label,
  ...props
}: { label: string } & TextInputProps) {
  const theme = useTheme();
  const styles = createStyles(theme);
  return (
    <View style={styles.field}>
      <FieldLabel>{label}</FieldLabel>
      <TextInput
        style={styles.input}
        placeholderTextColor={theme.textSecondary}
        {...props}
      />
    </View>
  );
}

/** Numeric total-price field, shown with a "$" prefix (5.3 Payment section). */
export function PriceField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const theme = useTheme();
  const styles = createStyles(theme);
  return (
    <View style={styles.field}>
      <FieldLabel>Total Price</FieldLabel>
      <View style={styles.priceRow}>
        <Text style={styles.pricePrefix}>$</Text>
        <TextInput
          style={styles.priceInput}
          placeholderTextColor={theme.textSecondary}
          placeholder="0.00"
          keyboardType="decimal-pad"
          value={value}
          onChangeText={onChange}
        />
      </View>
    </View>
  );
}

/** Generic single-select segmented control. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const styles = createStyles(useTheme());
  return (
    <View style={styles.field}>
      <FieldLabel>{label}</FieldLabel>
      <View style={styles.segment}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onChange(o.value)}
              style={[styles.segmentItem, active && styles.segmentItemActive]}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Due-date field. Enforces today-or-later via the picker's minimumDate (5.3). */
export function DueDateField({
  value,
  onChange,
}: {
  value: string; // ISO date
  onChange: (iso: string) => void;
}) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const [show, setShow] = useState(Platform.OS === 'ios');
  const date = value ? new Date(value) : new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // @react-native-community/datetimepicker has no web implementation — use a
  // native HTML date input there instead (created imperatively to avoid pulling
  // in DOM JSX typings on a React Native project).
  if (Platform.OS === 'web') {
    return (
      <View style={styles.field}>
        <FieldLabel>Due Date</FieldLabel>
        {createElement('input', {
          type: 'date',
          value: date.toISOString().slice(0, 10),
          min: today.toISOString().slice(0, 10),
          onChange: (e: { target: { value: string } }) => {
            if (!e.target.value) return;
            const picked = new Date(`${e.target.value}T12:00:00`);
            onChange(picked.toISOString());
          },
          style: webDateInputStyle(theme),
        })}
      </View>
    );
  }

  return (
    <View style={styles.field}>
      <FieldLabel>Due Date</FieldLabel>
      {Platform.OS === 'android' && (
        <Pressable style={styles.input} onPress={() => setShow(true)}>
          <Text style={styles.inputText}>{date.toLocaleDateString()}</Text>
        </Pressable>
      )}
      {show && (
        <DateTimePicker
          value={date}
          mode="date"
          minimumDate={today}
          display={Platform.OS === 'ios' ? 'compact' : 'default'}
          onChange={(_, picked) => {
            if (Platform.OS === 'android') setShow(false);
            if (picked) onChange(picked.toISOString());
          }}
        />
      )}
    </View>
  );
}

function webDateInputStyle(theme: ThemeTokens): Record<string, string | number> {
  return {
    backgroundColor: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: radius.md,
    padding: spacing.md,
    fontFamily: typography.body,
    fontSize: fontSize.body,
    color: theme.textPrimary,
    width: '100%',
    boxSizing: 'border-box',
  };
}

/** Camera/library reference-photo picker; persists the chosen image locally (5.3). */
export function PhotoPicker({
  uri,
  onChange,
}: {
  uri?: string;
  onChange: (uri: string | undefined) => void;
}) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const pick = async (fromCamera: boolean) => {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, mediaTypes: ['images'] });
    if (result.canceled || !result.assets[0]) return;
    const saved = await persistImage(result.assets[0].uri);
    onChange(saved);
  };

  return (
    <View style={styles.field}>
      <FieldLabel>Reference Photo</FieldLabel>
      {uri ? <Image source={{ uri }} style={styles.photo} contentFit="cover" /> : null}
      <View style={styles.photoRow}>
        <Pressable style={styles.photoBtn} onPress={() => pick(true)}>
          <Text style={styles.photoBtnText}>📷 Camera</Text>
        </Pressable>
        <Pressable style={styles.photoBtn} onPress={() => pick(false)}>
          <Text style={styles.photoBtnText}>📁 Library</Text>
        </Pressable>
        {uri ? (
          <Pressable style={styles.photoBtn} onPress={() => onChange(undefined)}>
            <Text style={[styles.photoBtnText, { color: theme.danger }]}>Remove</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function createStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    field: { marginBottom: spacing.lg },
    label: {
      fontFamily: typography.body,
      fontSize: fontSize.caption,
      color: theme.textSecondary,
      marginBottom: spacing.xs,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
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
    },
    inputText: { fontFamily: typography.body, fontSize: fontSize.body, color: theme.textPrimary },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
    },
    pricePrefix: {
      fontFamily: typography.body,
      fontSize: fontSize.body,
      color: theme.textSecondary,
      marginRight: spacing.xs,
    },
    priceInput: {
      flex: 1,
      paddingVertical: spacing.md,
      fontFamily: typography.body,
      fontSize: fontSize.body,
      color: theme.textPrimary,
    },
    segment: {
      flexDirection: 'row',
      backgroundColor: theme.background,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
      overflow: 'hidden',
    },
    segmentItem: { flex: 1, paddingVertical: spacing.md, alignItems: 'center' },
    segmentItemActive: { backgroundColor: theme.primary },
    segmentText: { fontFamily: typography.body, fontSize: fontSize.body, color: theme.textSecondary },
    segmentTextActive: { color: '#fff', fontWeight: '600' },
    photo: { width: '100%', height: 160, borderRadius: radius.lg, marginBottom: spacing.sm },
    photoRow: { flexDirection: 'row', gap: spacing.sm },
    photoBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.sm,
      backgroundColor: theme.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
    },
    photoBtnText: { fontFamily: typography.body, fontSize: fontSize.body, color: theme.primary },
  });
}
