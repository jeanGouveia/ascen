// ============================================================
// ARQUIVO 3: screens/LoginScreen.tsx
// Cole em: ascen/screens/LoginScreen.tsx
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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { C_light as C, R } from '../styles/theme';

const { width: W } = Dimensions.get('window');

// ─── Componente de input com validação visual ─────────────────

interface InputProps {
  label:       string;
  value:       string;
  onChange:    (v: string) => void;
  placeholder: string;
  secure?:     boolean;
  keyboard?:   'default' | 'email-address';
  error?:      string;
  autoCapitalize?: 'none' | 'sentences' | 'words';
}

function FormInput({ label, value, onChange, placeholder, secure, keyboard, error, autoCapitalize = 'none' }: InputProps) {
  const [hidden, setHidden] = useState(secure ?? false);
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={s.inputLabel}>{label}</Text>
      <View style={[
        s.inputWrap,
        focused && { borderColor: C.primary, shadowColor: C.primary, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
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
          <TouchableOpacity onPress={() => setHidden(h => !h)} style={s.eyeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={{ fontSize: 18 }}>{hidden ? '👁' : '🙈'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={s.inputError}>{error}</Text> : null}
    </View>
  );
}

// ─── Tela Principal ───────────────────────────────────────────

interface Props {
  onNavigateRegister: () => void;
}

export function LoginScreen({ onNavigateRegister }: Props) {
  const { signIn, signInWithGoogle, loading } = useAuth();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors]     = useState<{ email?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Animação de shake para erro
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
    const errs: typeof errors = {};
    if (!email.trim())            errs.email    = 'Informe seu e-mail.';
    else if (!email.includes('@')) errs.email   = 'E-mail inválido.';
    if (!password)                errs.password = 'Informe sua senha.';
    else if (password.length < 6) errs.password = 'Mínimo de 6 caracteres.';
    setErrors(errs);
    if (Object.keys(errs).length > 0) { shake(); return false; }
    return true;
  }

  async function handleLogin() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await signIn(email, password);
      // Sucesso → AuthContext atualiza o user → App redireciona automaticamente
    } catch (err: any) {
      Alert.alert('Não foi possível entrar', err.message);
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo / Marca */}
          <View style={s.logoArea}>
            <View style={s.logoCircle}>
              <Text style={{ fontSize: 36 }}>📈</Text>
            </View>
            <Text style={s.logoName}>Ascen</Text>
            <Text style={s.logoTagline}>Sua vida financeira, organizada.</Text>
          </View>

          {/* Card do formulário */}
          <Animated.View style={[s.formCard, { transform: [{ translateX: shakeAnim }] }]}>
            <Text style={s.formTitle}>Entrar na conta</Text>
            <Text style={s.formSubtitle}>Bem-vindo de volta 👋</Text>

            <View style={{ marginTop: 24 }}>
              <FormInput
                label="E-mail"
                value={email}
                onChange={v => { setEmail(v); setErrors(e => ({ ...e, email: undefined })); }}
                placeholder="seu@email.com"
                keyboard="email-address"
                error={errors.email}
              />
              <FormInput
                label="Senha"
                value={password}
                onChange={v => { setPassword(v); setErrors(e => ({ ...e, password: undefined })); }}
                placeholder="Mínimo 6 caracteres"
                secure
                error={errors.password}
              />
            </View>

            <TouchableOpacity style={s.forgotBtn} onPress={() => Alert.alert('Recuperar senha', 'Enviamos um link de recuperação para o seu e-mail.')}>
              <Text style={s.forgotText}>Esqueceu a senha?</Text>
            </TouchableOpacity>

            {/* Botão principal */}
            <TouchableOpacity
              style={[s.primaryBtn, (submitting || loading) && { opacity: 0.7 }]}
              onPress={handleLogin}
              activeOpacity={0.85}
              disabled={submitting || loading}
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.primaryBtnText}>Entrar</Text>
              }
            </TouchableOpacity>

            {/* Divisor */}
            <View style={s.divider}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>ou continue com</Text>
              <View style={s.dividerLine} />
            </View>

            {/* Google */}
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
                    <Text style={s.googleBtnText}>Entrar com Google</Text>
                  </>
                )
              }
            </TouchableOpacity>
          </Animated.View>

          {/* Rodapé — ir para cadastro */}
          <View style={s.footer}>
            <Text style={s.footerText}>Não tem conta? </Text>
            <TouchableOpacity onPress={onNavigateRegister} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={s.footerLink}>Criar conta grátis</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.legal}>
            Ao entrar, você concorda com nossos{'\n'}
            Termos de Uso e Política de Privacidade.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────

const s = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },

  // Logo
  logoArea: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.20,
    shadowRadius: 12,
    elevation: 6,
  },
  logoName: {
    fontSize: 34,
    fontWeight: '900',
    color: C.primary,
    letterSpacing: -1,
  },
  logoTagline: {
    fontSize: 15,
    color: C.textMuted,
    marginTop: 4,
  },

  // Card
  formCard: {
    backgroundColor: C.card,
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.5,
  },
  formSubtitle: {
    fontSize: 14,
    color: C.textMuted,
    marginTop: 4,
  },

  // Inputs
  inputLabel: {
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
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: C.text,
    paddingVertical: 14,
    fontWeight: '500',
  },
  eyeBtn: {
    padding: 4,
    marginLeft: 8,
  },
  inputError: {
    fontSize: 12,
    color: C.danger,
    marginTop: 5,
    marginLeft: 4,
    fontWeight: '500',
  },

  // Esqueci a senha
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    marginTop: -4,
  },
  forgotText: {
    fontSize: 14,
    color: C.primary,
    fontWeight: '600',
  },

  // Botão primário
  primaryBtn: {
    backgroundColor: C.primary,
    borderRadius: R.full,
    padding: 16,
    alignItems: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // Divisor
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
  },
  dividerText: {
    fontSize: 13,
    color: C.textMuted,
    fontWeight: '500',
  },

  // Google
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: C.bg,
    borderRadius: R.full,
    padding: 14,
    borderWidth: 2,
    borderColor: C.border,
  },
  googleBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
  },
  footerText: {
    fontSize: 15,
    color: C.textMuted,
  },
  footerLink: {
    fontSize: 15,
    color: C.primary,
    fontWeight: '700',
  },

  // Legal
  legal: {
    textAlign: 'center',
    fontSize: 11,
    color: C.textMuted,
    marginTop: 20,
    lineHeight: 16,
  },
});