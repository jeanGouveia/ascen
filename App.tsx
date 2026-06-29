import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme, Theme } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { PreferencesProvider, usePreferences } from './src/context/PreferencesContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { SessionProvider, useSession } from './src/context/SessionContext';
import { UserLocalDataProvider } from './src/context/UserLocalDataContext';
import { FamilyProvider } from './src/context/FamilyContext';
import { AppProvider, useApp } from './src/context/AppContext';
import { CategoryProvider } from './src/context/CategoryContext';
import { RecurringProvider } from './src/context/RecurringContext';
import { GoalsProvider } from './src/context/GoalsContext';
import { OnboardingProvider, useOnboarding } from './src/context/OnboardingContext';
import { AppNavigator } from './src/screens/AppNavigator';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { ResetPasswordScreen } from './src/screens/ResetPasswordScreen'; // ← tela nova
import { SessionLockScreen } from './src/screens/SessionLockScreen';
import { TransactionModal } from './src/components/TransactionModal';
import { CoachMarksOverlay } from './src/components/CoachMarksOverlay';
import { getColors, C_light } from './src/styles/theme';
import * as SplashScreen from 'expo-splash-screen';
import { supabase } from './src/services/supabase';

function ThemedNavigation({ children }: { children: React.ReactNode }) {
  const { darkMode, loaded } = usePreferences();
  const C = useMemo(() => getColors(darkMode), [darkMode]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  const navTheme = useMemo((): Theme => {
    const base = darkMode ? DarkTheme : DefaultTheme;
    return {
      ...base,
      dark: darkMode,
      colors: {
        ...base.colors,
        primary: C.primary,
        background: C.bg,
        card: C.card,
        text: C.text,
        border: C.border,
        notification: C.primary,
      },
    };
  }, [darkMode, C]);

  if (!loaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C_light.bg }}>
        <ActivityIndicator size="large" color={C_light.primary} />
      </View>
    );
  }

  return <NavigationContainer theme={navTheme}>{children}</NavigationContainer>;
}

// ─── Intercepta deep links de reset de senha ──────────────────────────────────
//
// Quando o usuário toca no link do e-mail de recuperação, o Supabase monta uma
// URL do tipo:  <scheme>://reset-password?code=XXXX  (PKCE flow)
//               ou  <scheme>://reset-password#access_token=...&type=recovery
//
// Precisamos capturar essa URL e repassar ao Supabase para que ele troque o
// code/token por uma sessão e emita o evento PASSWORD_RECOVERY para o
// onAuthStateChange ouvir.
//
function useDeepLinkPasswordReset() {
  useEffect(() => {
    async function handleUrl(url: string) {
      if (!url.includes('reset-password')) return;

      // Tenta extrair "code" (PKCE) de query string ou fragmento
      const allParts: string[] = [];
      if (url.includes('?')) allParts.push(url.split('?')[1]?.split('#')[0] ?? '');
      if (url.includes('#')) allParts.push(url.split('#')[1] ?? '');

      let code: string | null = null;
      let accessToken: string | null = null;
      let refreshToken: string | null = null;

      for (const part of allParts) {
        if (!part) continue;
        const params = new URLSearchParams(part);
        code         = code         ?? params.get('code');
        accessToken  = accessToken  ?? params.get('access_token');
        refreshToken = refreshToken ?? params.get('refresh_token');
      }

      try {
        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
          // onAuthStateChange receberá PASSWORD_RECOVERY → awaitingPasswordReset = true
        } else if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[PasswordReset] Falha ao trocar token:', e);
      }
    }

    // Caso o app já esteja aberto quando o link é tocado
    const subscription = Linking.addEventListener('url', ({ url }) => {
      void handleUrl(url);
    });

    // Caso o app tenha sido aberto pelo link (cold start)
    Linking.getInitialURL().then(url => {
      if (url) void handleUrl(url);
    });

    return () => subscription.remove();
  }, []);
}

// ─── AuthGate ─────────────────────────────────────────────────────────────────

function AuthGate() {
  const { user, loading, awaitingPasswordReset } = useAuth();
  const [screen, setScreen] = useState<'login' | 'register'>('login');

  // Registra o listener de deep links de recuperação de senha
  useDeepLinkPasswordReset();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C_light.bg }}>
        <Text style={{ color: C_light.primary, fontSize: 16, fontWeight: '600' }}>Carregando...</Text>
      </View>
    );
  }

  // Usuário clicou no link de reset de senha: mostrar tela de redefinição.
  // O Supabase cria uma sessão temporária do tipo "recovery" — user não é null.
  if (awaitingPasswordReset && user) {
    return (
      <ResetPasswordScreen
        onSuccess={() => {
          // Após salvar a nova senha voltamos para o login;
          // o onAuthStateChange cuidará de limpar awaitingPasswordReset.
          setScreen('login');
        }}
      />
    );
  }

  if (!user) {
    if (screen === 'register') {
      return <RegisterScreen onNavigateLogin={() => setScreen('login')} />;
    }
    return <LoginScreen onNavigateRegister={() => setScreen('register')} />;
  }

  return <AppContent />;
}

// ─── AppContent ───────────────────────────────────────────────────────────────

function AppContent() {
  const { modalState, closeTxModal } = useApp();
  const { darkMode } = usePreferences();
  const { shouldShow, isReady, startOnboarding } = useOnboarding();
  const { locked } = useSession();

  React.useEffect(() => {
    if (isReady && shouldShow) {
      const t = setTimeout(() => startOnboarding(), 800);
      return () => clearTimeout(t);
    }
  }, [isReady]);

  return (
    <>
      <StatusBar style={darkMode ? 'light' : 'dark'} />
      <AppNavigator />
      <TransactionModal state={modalState} onClose={closeTxModal} />
      <CoachMarksOverlay />
      {locked && <SessionLockScreen />}
    </>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PreferencesProvider>
          <ThemedNavigation>
            <AuthProvider>
              <SessionProvider>
                <UserLocalDataProvider>
                  <FamilyProvider>
                    <AppProvider>
                      <CategoryProvider>
                        <RecurringProvider>
                          <GoalsProvider>
                            <OnboardingProvider>
                              <AuthGate />
                            </OnboardingProvider>
                          </GoalsProvider>
                        </RecurringProvider>
                      </CategoryProvider>
                    </AppProvider>
                  </FamilyProvider>
                </UserLocalDataProvider>
              </SessionProvider>
            </AuthProvider>
          </ThemedNavigation>
        </PreferencesProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}