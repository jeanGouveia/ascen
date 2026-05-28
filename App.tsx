import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme, Theme } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { PreferencesProvider, usePreferences } from './src/context/PreferencesContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { UserLocalDataProvider } from './src/context/UserLocalDataContext';
import { FamilyProvider } from './src/context/FamilyContext';
import { AppProvider, useApp } from './src/context/AppContext';
import { CategoryProvider } from './src/context/CategoryContext';
import { RecurringProvider } from './src/context/RecurringContext';
import { GoalsProvider } from './src/context/GoalsContext';
import { AppNavigator } from './src/screens/AppNavigator';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { TransactionModal } from './src/components/TransactionModal';
import { getColors, C_light } from './src/styles/theme';
import * as SplashScreen from 'expo-splash-screen';

function ThemedNavigation({ children }: { children: React.ReactNode }) {
  const { darkMode, loaded } = usePreferences();
  const C = useMemo(() => getColors(darkMode), [darkMode]);
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
  } else if (loaded === true) {
    useEffect(() => {
      if (loaded) {
        SplashScreen.hideAsync();
      }
    }, [loaded]);

  }

  return <NavigationContainer theme={navTheme}>{children}</NavigationContainer>;
}

function AuthGate() {
  const { user, loading } = useAuth();
  const [screen, setScreen] = useState<'login' | 'register'>('login');

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C_light.bg }}>
        <Text style={{ color: C_light.primary, fontSize: 16, fontWeight: '600' }}>Carregando...</Text>
      </View>
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

function AppContent() {
  const { modalState, closeTxModal } = useApp();
  const { darkMode } = usePreferences();

  return (
    <>
      <StatusBar style={darkMode ? 'light' : 'dark'} />
      <AppNavigator />
      <TransactionModal state={modalState} onClose={closeTxModal} />
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PreferencesProvider>
          <ThemedNavigation>
            <AuthProvider>
              <UserLocalDataProvider>
                <FamilyProvider>
                  <AppProvider>
                    <CategoryProvider>
                      <RecurringProvider>
                        <GoalsProvider>
                          <AuthGate />
                        </GoalsProvider>
                      </RecurringProvider>
                    </CategoryProvider>
                  </AppProvider>
                </FamilyProvider>
              </UserLocalDataProvider>
            </AuthProvider>
          </ThemedNavigation>
        </PreferencesProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
