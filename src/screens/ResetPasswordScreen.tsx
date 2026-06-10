import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { FormInput } from '../components/FormInput';
import { useAppTheme } from '../hooks/useAppTheme';
import { R } from '../styles/theme';

interface Props {
  onSuccess: () => void; // callback para voltar ao Login após redefinir
}

export function ResetPasswordScreen({ onSuccess }: Props) {
  const { C } = useAppTheme();
  const { updatePassword } = useAuth();

  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [errors, setErrors]       = useState<{ password?: string; confirm?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const errs: typeof errors = {};
    if (!password)                errs.password = 'Informe a nova senha.';
    else if (password.length < 6) errs.password = 'Mínimo de 6 caracteres.';
    if (!confirm)                 errs.confirm  = 'Confirme a nova senha.';
    else if (confirm !== password) errs.confirm  = 'As senhas não coincidem.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await updatePassword(password);
      Alert.alert(
        'Senha redefinida',
        'Sua senha foi alterada com sucesso. Use-a na próxima vez que entrar.',
        [{ text: 'OK', onPress: onSuccess }]
      );
    } catch (err: any) {
      Alert.alert('Erro', err.message ?? 'Não foi possível redefinir a senha. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.header}>
            <Text style={[s.title, { color: C.text }]}>Redefinir senha</Text>
            <Text style={[s.subtitle, { color: C.textMuted }]}>
              Escolha uma nova senha para a sua conta.
            </Text>
          </View>

          <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>
            <FormInput
              label="Nova senha"
              value={password}
              onChange={v => {
                setPassword(v);
                setErrors(prev => ({ ...prev, password: undefined }));
              }}
              placeholder="Mínimo 6 caracteres"
              secure
              error={errors.password}
            />
            <FormInput
              label="Confirmar nova senha"
              value={confirm}
              onChange={v => {
                setConfirm(v);
                setErrors(prev => ({ ...prev, confirm: undefined }));
              }}
              placeholder="Repita a nova senha"
              secure
              error={errors.confirm}
            />

            <TouchableOpacity
              style={[s.btn, { backgroundColor: C.primary, opacity: submitting ? 0.7 : 1 }]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnText}>Salvar nova senha</Text>
              }
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 28,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
  },
  btn: {
    borderRadius: R.full,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
