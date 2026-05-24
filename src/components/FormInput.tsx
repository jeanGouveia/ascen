import React, { memo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { C_light as C } from '../styles/theme';

export interface FormInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  secure?: boolean;
  keyboard?: 'default' | 'email-address';
  error?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words';
  hint?: string;
}

function FormInputComponent({
  label,
  value,
  onChange,
  placeholder,
  secure,
  keyboard,
  error,
  autoCapitalize = 'none',
  hint,
}: FormInputProps) {
  const [hidden, setHidden] = useState(secure ?? false);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputWrap,
          focused && styles.inputWrapFocused,
          error && styles.inputWrapError,
        ]}
      >
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={C.textMuted}
          secureTextEntry={hidden}
          keyboardType={keyboard ?? 'default'}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {secure && (
          <TouchableOpacity
            onPress={() => setHidden(h => !h)}
            style={styles.eyeBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel={hidden ? 'Mostrar senha' : 'Ocultar senha'}
            accessibilityRole="button"
          >
            <Text style={{ fontSize: 18 }}>{hidden ? '👁' : '🙈'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {hint && !error ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export const FormInput = memo(FormInputComponent);

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: C.textMuted,
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bg,
    borderWidth: 2,
    borderColor: C.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    elevation: 0,
  },
  inputWrapFocused: {
    borderColor: C.primary,
  },
  inputWrapError: { borderColor: C.danger },
  input: {
    flex: 1,
    fontSize: 16,
    color: C.text,
    paddingVertical: 14,
    fontWeight: '500',
  },
  eyeBtn: { padding: 4, marginLeft: 8 },
  error: {
    fontSize: 12,
    color: C.danger,
    marginTop: 5,
    marginLeft: 4,
    fontWeight: '500',
  },
  hint: {
    fontSize: 12,
    color: C.textMuted,
    marginTop: 5,
    marginLeft: 4,
  },
});
