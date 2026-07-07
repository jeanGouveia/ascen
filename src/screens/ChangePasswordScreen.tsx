import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useSession } from '../context/SessionContext';
import { useAppTheme } from '../hooks/useAppTheme';
import { validatePassword, PASSWORD_MIN_LENGTH } from '../utils/passwordPolicy';
import { logError } from '../services/sentry';

export function ChangePasswordScreen() {
  const { canChangePassword, updatePassword } = useAuth();
  const { C, s } = useAppTheme();
  const { touch } = useSession();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  // Reset timer when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      touch();
    }, [touch])
  );

  if (!canChangePassword) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, padding: 20 }} edges={['bottom']}>
        <Text style={s.settingLabel}>Conta sem senha do Ascen</Text>
        <Text style={[s.txMeta, { marginTop: 10, lineHeight: 20 }]}>
          Você entrou com Google (ou outro provedor). A senha do app não se aplica a este tipo de login.
        </Text>
      </SafeAreaView>
    );
  }

  const submit = async () => {
    const pwdCheck = validatePassword(password);
    if (!pwdCheck.valid) {
      Alert.alert('Senha', pwdCheck.reason ?? 'Senha inválida.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Senha', 'A confirmação não coincide com a nova senha.');
      return;
    }
    setSaving(true);
    try {
      await updatePassword(password);
      setPassword('');
      setConfirm('');
      Alert.alert('Senha alterada', 'Na próxima vez, use a nova senha para entrar.');
    } catch (e) {
      const error = e instanceof Error ? e : new Error('Failed to change password');
      logError(error, { context: 'changePassword' });
      Alert.alert('Erro', 'Não foi possível alterar a senha. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={[s.pageSubtitle, { marginBottom: 18 }]}>
          Defina uma nova senha para entrar com e-mail e senha. Você já está autenticado; não é necessário informar a senha antiga.
        </Text>

        <View style={s.formGroup}>
          <Text style={s.formLabel}>NOVA SENHA</Text>
          <TextInput
            style={s.textInput}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              touch();
            }}
            placeholder={`Mínimo ${PASSWORD_MIN_LENGTH} caracteres`}
            placeholderTextColor={C.textMuted}
            secureTextEntry
            autoCapitalize="none"
            textContentType="newPassword"
            accessibilityLabel="Nova senha"
          />
        </View>

        <View style={s.formGroup}>
          <Text style={s.formLabel}>CONFIRMAR NOVA SENHA</Text>
          <TextInput
            style={s.textInput}
            value={confirm}
            onChangeText={(text) => {
              setConfirm(text);
              touch();
            }}
            placeholder="Repita a nova senha"
            placeholderTextColor={C.textMuted}
            secureTextEntry
            autoCapitalize="none"
            textContentType="newPassword"
            accessibilityLabel="Confirmar nova senha"
          />
        </View>

        <TouchableOpacity
          onPress={submit}
          disabled={saving}
          style={[s.modalBtn, { backgroundColor: C.primary, opacity: saving ? 0.7 : 1 }]}
          accessibilityRole="button"
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Atualizar senha</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
