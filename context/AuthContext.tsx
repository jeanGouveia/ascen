import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// Necessário para o fluxo OAuth fechar o browser automaticamente
WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  user:             User | null;
  session:          Session | null;
  loading:          boolean;
  signIn:           (email: string, password: string) => Promise<void>;
  signUp:           (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut:          () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Ouve sessão ativa (persistência)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Ouve Deep Links (Essencial para o retorno do navegador no Android/iOS)
  useEffect(() => {
    const handleUrl = (url: string) => {
      const { queryParams } = Linking.parse(url);
      
      // O Supabase pode mandar tokens no query ou no fragmento (#)
      let accessToken = queryParams?.access_token;
      let refreshToken = queryParams?.refresh_token;

      // Se estiver no fragmento (comum no Supabase), extraímos manualmente
      if (!accessToken && url.includes('#')) {
        const fragment = url.split('#')[1];
        const params = new URLSearchParams(fragment);
        accessToken = params.get('access_token');
        refreshToken = params.get('refresh_token');
      }

      if (accessToken && refreshToken) {
        supabase.auth.setSession({
          access_token: accessToken as string,
          refresh_token: refreshToken as string,
        }).catch(err => console.error("Erro ao setar sessão:", err));
      }
    };

    // Ouve se o app for aberto via URL enquanto já estava em background
    const subscription = Linking.addEventListener('url', (event) => {
      handleUrl(event.url);
    });

    // Checa se o app foi aberto do zero via URL
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    return () => subscription.remove();
  }, []);

  async function signIn(email: string, password: string) {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) throw new Error(mapAuthError(error.message));
  }

  async function signUp(email: string, password: string, name: string) {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email:    email.trim(),
      password,
      options:  { data: { full_name: name.trim() } },
    });
    setLoading(false);
    if (error) throw new Error(mapAuthError(error.message));
  }

  async function signInWithGoogle() {
    try {
      // O redirectUrl deve ser o scheme configurado no app.json
      const redirectUrl = Linking.createURL('google-auth');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Abre o navegador. O listener de Deep Link acima cuidará do retorno.
        await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      }
    } catch (err: any) {
      Alert.alert('Erro no login com Google', err.message);
    }
  }

  async function signOut() {
    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

function mapAuthError(msg: string): string {
  if (msg.includes('Invalid login credentials'))    return 'E-mail ou senha incorretos.';
  if (msg.includes('Email not confirmed'))          return 'Confirme seu e-mail antes de entrar.';
  if (msg.includes('User already registered'))      return 'Este e-mail já está cadastrado.';
  if (msg.includes('Password should be at least'))  return 'A senha deve ter ao menos 6 caracteres.';
  if (msg.includes('Unable to validate email'))     return 'E-mail inválido.';
  if (msg.includes('rate limit'))                   return 'Muitas tentativas. Aguarde alguns minutos.';
  return 'Ocorreu um erro. Tente novamente.';
}
