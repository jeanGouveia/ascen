// ============================================================
// ARQUIVO 4: screens/RegisterScreen.tsx
// Cole em: ascen/screens/RegisterScreen.tsx
// ============================================================

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { C, R } from '../styles/theme';

// Indicador de força de senha
function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score  = checks.filter(Boolean).length;
  const labels = ['', 'Fraca', 'Razoável', 'Boa', 'Forte'];
  const colors = ['', '#EF4444', '#F59E0B', '#3B82F6', '#16A34A'];

  return (
    <View style={{ marginTop: 6, marginBottom: 4 }}>
      <View style={{ flexDirection: 'row', gap: 4, marginBottom: 4 }}>
        {[1, 2, 3, 4].map(i => (
          <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= score ? colors[score] : '#E4E9F8' }} />
        ))}
      </View>
      {score > 0 && (
        <Text style={{ fontSize: 12, color: colors[score], fontWeight: '600' }}>
          Senha {labels[score]}
        </Text>
      )}
    </View>
  );
}

interface InputProps {
  label:       string;
  value:       string;
  onChange:    (v: string) => void;
  placeholder: string;
  secure?:     boolean;
  keyboard?:   'default' | 'email-address';
  error?:      string;
  autoCapitalize?: 'none' | 'sentences' | 'words';
  hint?:       string;
}

function FormInput({ label, value, onChange, placeholder, secure, keyboard, error, autoCapitalize = 'none', hint }: InputProps) {
  const [hidden, setHidden] = useState(secure ?? false);
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={s.inputLabel}>{label}</Text>
      <View style={[
        s.inputWrap,
        focused && { borderColor: C.primary },
        error  && { borderColor: C.danger },
      ]}>
        <TextInput
          style={s.input}
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
          <TouchableOpacity onPress={() => setHidden(h => !h)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={{ fontSize: 18, marginLeft: 8 }}>{hidden ? '👁' : '🙈'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={s.inputError}>{error}</Text> : null}
      {hint && !error ? <Text style={s.inputHint}>{hint}</Text> : null}
    </View>
  );
}

interface Props {
  onNavigateLogin: () => void;
}

export function RegisterScreen({ onNavigateLogin }: Props) {
  const { signUp, signInWithGoogle, loading } = useAuth();

  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [errors, setErrors]     = useState<Record<string, string>>({});
  const [submitting, setSubmitting]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [done, setDone]                   = useState(false);

  const shakeAnim = useRef(new Animated.Value(0)).current;

  function shake() {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6,   duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 60, useNativeDriver: true }),
    ]).start();
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim())                    errs.name     = 'Informe seu nome.';
    if (!email.trim())                   errs.email    = 'Informe seu e-mail.';
    else if (!email.includes('@'))       errs.email    = 'E-mail inválido.';
    if (!password)                       errs.password = 'Informe uma senha.';
    else if (password.length < 6)        errs.password = 'Mínimo de 6 caracteres.';
    if (confirm !== password)            errs.confirm  = 'As senhas não coincidem.';
    setErrors(errs);
    if (Object.keys(errs).length > 0) { shake(); return false; }
    return true;
  }

  async function handleRegister() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await signUp(email, password, name);
      setDone(true); // Mostra tela de confirmação de e-mail
    } catch (err: any) {
      Alert.alert('Erro no cadastro', err.message);
      shake();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      Alert.alert('Erro no login com Google', err.message);
    } finally {
      setGoogleLoading(false);
    }
  }

  // Tela de sucesso — confirmar e-mail
  if (done) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <View style={[s.logoCircle, { backgroundColor: C.successLight, width: 100, height: 100, borderRadius: 30 }]}>
            <Text style={{ fontSize: 46 }}>📧</Text>
          </View>
          <Text style={{ fontSize: 26, fontWeight: '800', color: C.text, textAlign: 'center', marginTop: 20, letterSpacing: -0.5 }}>
            Confirme seu e-mail
          </Text>
          <Text style={{ fontSize: 16, color: C.textMuted, textAlign: 'center', marginTop: 10, lineHeight: 24 }}>
            Enviamos um link de confirmação para{'\n'}
            <Text style={{ color: C.primary, fontWeight: '700' }}>{email}</Text>
            {'\n\n'}Abra o e-mail e clique no link para ativar sua conta.
          </Text>
          <TouchableOpacity
            onPress={onNavigateLogin}
            style={[s.primaryBtn, { marginTop: 36, width: '100%' }]}
            activeOpacity={0.85}
          >
            <Text style={s.primaryBtnText}>Ir para o login</Text>
          </TouchableOpacity>
          <Text style={{ color: C.textMuted, fontSize: 13, textAlign: 'center', marginTop: 16 }}>
            Não recebeu? Verifique a caixa de spam.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Botão voltar */}
          <TouchableOpacity onPress={onNavigateLogin} style={s.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={{ fontSize: 22, color: C.textMid }}>←</Text>
            <Text style={{ fontSize: 15, color: C.textMid, fontWeight: '600', marginLeft: 6 }}>Voltar</Text>
          </TouchableOpacity>

          {/* Cabeçalho */}
          <View style={s.logoArea}>
            <View style={s.logoCircle}>
              <Text style={{ fontSize: 36 }}>📈</Text>
            </View>
            <Text style={s.logoName}>Criar conta</Text>
            <Text style={s.logoTagline}>Comece a organizar suas finanças</Text>
          </View>

          <Animated.View style={[s.formCard, { transform: [{ translateX: shakeAnim }] }]}>
            <Text style={s.formTitle}>Seus dados</Text>
            <Text style={s.formSubtitle}>Preencha para criar sua conta gratuita</Text>

            <View style={{ marginTop: 20 }}>
              <FormInput
                label="Nome completo"
                value={name}
                onChange={v => { setName(v); setErrors(e => ({ ...e, name: undefined! })); }}
                placeholder="Como quer ser chamado?"
                autoCapitalize="words"
                error={errors.name}
              />
              <FormInput
                label="E-mail"
                value={email}
                onChange={v => { setEmail(v); setErrors(e => ({ ...e, email: undefined! })); }}
                placeholder="seu@email.com"
                keyboard="email-address"
                error={errors.email}
              />
              <FormInput
                label="Senha"
                value={password}
                onChange={v => { setPassword(v); setErrors(e => ({ ...e, password: undefined! })); }}
                placeholder="Mínimo 6 caracteres"
                secure
                error={errors.password}
              />
              {/* Medidor de força da senha */}
              {password.length > 0 && <PasswordStrength password={password} />}

              <View style={{ marginTop: 8 }}>
                <FormInput
                  label="Confirmar senha"
                  value={confirm}
                  onChange={v => { setConfirm(v); setErrors(e => ({ ...e, confirm: undefined! })); }}
                  placeholder="Digite a senha novamente"
                  secure
                  error={errors.confirm}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[s.primaryBtn, (submitting || loading) && { opacity: 0.7 }]}
              onPress={handleRegister}
              activeOpacity={0.85}
              disabled={submitting || loading}
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.primaryBtnText}>Criar conta grátis</Text>
              }
            </TouchableOpacity>

            <View style={s.divider}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>ou cadastre com</Text>
              <View style={s.dividerLine} />
            </View>

            <TouchableOpacity
              style={[s.googleBtn, googleLoading && { opacity: 0.7 }]}
              onPress={handleGoogle}
              activeOpacity={0.85}
              disabled={googleLoading || loading}
            >
              {googleLoading
                ? <ActivityIndicator color={C.textMid} />
                : (
                  <>
                    <Text style={{ fontSize: 22 }}>🔵</Text>
                    <Text style={s.googleBtnText}>Continuar com Google</Text>
                  </>
                )
              }
            </TouchableOpacity>
          </Animated.View>

          <View style={s.footer}>
            <Text style={s.footerText}>Já tem conta? </Text>
            <TouchableOpacity onPress={onNavigateLogin} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={s.footerLink}>Entrar</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.legal}>
            Ao criar uma conta, você concorda com nossos{'\n'}
            Termos de Uso e Política de Privacidade.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  scroll: { flexGrow: 1, padding: 24, paddingBottom: 40 },

  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },

  logoArea:    { alignItems: 'center', marginBottom: 28 },
  logoCircle:  { width: 80, height: 80, borderRadius: 24, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 12, shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.20, shadowRadius: 12, elevation: 6 },
  logoName:    { fontSize: 28, fontWeight: '900', color: C.primary, letterSpacing: -0.8 },
  logoTagline: { fontSize: 14, color: C.textMuted, marginTop: 4 },

  formCard:    { backgroundColor: C.card, borderRadius: 28, padding: 24, borderWidth: 1, borderColor: '#E4E9F8', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 5 },
  formTitle:   { fontSize: 20, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  formSubtitle:{ fontSize: 14, color: C.textMuted, marginTop: 4 },

  inputLabel: { fontSize: 12, fontWeight: '700', color: C.textMuted, letterSpacing: 0.8, marginBottom: 8, textTransform: 'uppercase' },
  inputWrap:  { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderWidth: 2, borderColor: '#E4E9F8', borderRadius: 16, paddingHorizontal: 16 },
  input:      { flex: 1, fontSize: 16, color: C.text, paddingVertical: 14, fontWeight: '500' },
  inputError: { fontSize: 12, color: C.danger, marginTop: 5, marginLeft: 4, fontWeight: '500' },
  inputHint:  { fontSize: 12, color: C.textMuted, marginTop: 5, marginLeft: 4 },

  primaryBtn:     { backgroundColor: C.primary, borderRadius: R.full, padding: 16, alignItems: 'center', shadowColor: C.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6 },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },

  divider:     { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E4E9F8' },
  dividerText: { fontSize: 13, color: C.textMuted, fontWeight: '500' },

  googleBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: C.bg, borderRadius: R.full, padding: 14, borderWidth: 2, borderColor: '#E4E9F8' },
  googleBtnText: { fontSize: 16, fontWeight: '700', color: C.text },

  footer:     { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 28 },
  footerText: { fontSize: 15, color: C.textMuted },
  footerLink: { fontSize: 15, color: C.primary, fontWeight: '700' },

  legal: { textAlign: 'center', fontSize: 11, color: C.textMuted, marginTop: 20, lineHeight: 16 },
});