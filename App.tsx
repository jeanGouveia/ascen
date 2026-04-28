import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AppProvider, useApp } from './src/context/AppContext';
import { AppNavigator } from './src/screens/AppNavigator';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { TransactionModal } from './src/components/TransactionModal';

function AuthGate() {
  const { user, loading } = useAuth();
  const [screen, setScreen] = useState<'login' | 'register'>('login');

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F5F7FF',
        }}
      >
        <Text style={{ color: '#4F6EF7', fontSize: 16, fontWeight: '600' }}>Carregando...</Text>
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

  return (
    <>
      <StatusBar style="dark" />
      <AppNavigator />
      <TransactionModal state={modalState} onClose={closeTxModal} />
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <AuthProvider>
            <AppProvider>
              <AuthGate />
            </AppProvider>
          </AuthProvider>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
