import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useAppTheme } from '../../../hooks/useAppTheme';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirm?: boolean;
  submitLabel?: string;
  onCancel: () => void;
  onSubmit: (passphrase: string) => void;
};

export function PassphraseModal({
  visible,
  title,
  message,
  confirm = false,
  submitLabel = 'OK',
  onCancel,
  onSubmit,
}: Props) {
  const { C, s } = useAppTheme();
  const [value, setValue] = useState('');
  const [confirmValue, setConfirmValue] = useState('');

  const reset = () => {
    setValue('');
    setConfirmValue('');
  };

  const handleSubmit = () => {
    const a = value.trim();
    const b = confirmValue.trim();
    if (a.length < 8) return;
    if (confirm && a !== b) return;
    onSubmit(a);
    reset();
  };

  const valid = value.trim().length >= 8 && (!confirm || value.trim() === confirmValue.trim());

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)', padding: 24 }}
      >
        <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: C.border }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 8 }}>{title}</Text>
          <Text style={{ color: C.textMuted, marginBottom: 16, lineHeight: 20 }}>{message}</Text>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder="Senha de backup (mín. 8)"
            secureTextEntry
            autoCapitalize="none"
            style={{
              borderWidth: 1,
              borderColor: C.border,
              borderRadius: 10,
              padding: 12,
              color: C.text,
              marginBottom: confirm ? 10 : 16,
            }}
          />
          {confirm && (
            <TextInput
              value={confirmValue}
              onChangeText={setConfirmValue}
              placeholder="Confirmar senha"
              secureTextEntry
              autoCapitalize="none"
              style={{
                borderWidth: 1,
                borderColor: C.border,
                borderRadius: 10,
                padding: 12,
                color: C.text,
                marginBottom: 16,
              }}
            />
          )}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={[s.modalBtn, { flex: 1, backgroundColor: C.border }]} onPress={() => { reset(); onCancel(); }}>
              <Text style={{ textAlign: 'center', fontWeight: '600', color: C.text }}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.modalBtn, { flex: 1, backgroundColor: valid ? C.primary : C.border }]}
              onPress={handleSubmit}
              disabled={!valid}
            >
              <Text style={{ textAlign: 'center', fontWeight: '700', color: '#fff' }}>{submitLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
