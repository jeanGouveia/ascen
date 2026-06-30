import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { clearStoredGoogleTokens } from '../experimental/backup/services/googleAccessToken';
import { authorizeGoogleDriveDirect } from '../experimental/backup/services/googleDriveAuthDirect';
import { isGoogleDriveConfigured, getGoogleDriveSetupHint } from '../experimental/backup/config/googleOAuth';
import { sanitizeEmail, sanitizeName } from '../utils/inputSanitizer';

WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  canChangePassword: boolean;
  awaitingPasswordReset: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  reconnectGoogleForDrive: () => Promise<boolean>;
  signOut: () => Promise<void>;
  updateProfile: (params: { fullName: string; avatarUrl?: string | null }) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);
export const useAuth = () => useContext(AuthContext);

/** Evita processar o mesmo redirect OAuth duas vezes (causa erro PKCE). */
let oauthRedirectInFlight = false;

function parseOAuthReturnUrl(url: string): {
  code?: string;
  accessToken?: string;
  refreshToken?: string;
} {
  const parsed = Linking.parse(url);
  const qp = parsed.queryParams ?? {};

  let code = typeof qp.code === 'string' ? qp.code : undefined;
  let accessToken = typeof qp.access_token === 'string' ? qp.access_token : undefined;
  let refreshToken = typeof qp.refresh_token === 'string' ? qp.refresh_token : undefined;

  const parts: string[] = [];
  if (url.includes('?')) parts.push(url.split('?')[1]?.split('#')[0] ?? '');
  if (url.includes('#')) parts.push(url.split('#')[1] ?? '');

  for (const part of parts) {
    if (!part) continue;
    const params = new URLSearchParams(part);
    code = code ?? params.get('code') ?? undefined;
    accessToken = accessToken ?? params.get('access_token') ?? undefined;
    refreshToken = refreshToken ?? params.get('refresh_token') ?? undefined;
  }

  return { code, accessToken, refreshToken };
}

function isSupabaseOAuthReturnUrl(url: string): boolean {
  return url.includes('google-auth') || url.includes('access_token=') || url.includes('code=');
}

async function completeSupabaseOAuthFromUrl(url: string): Promise<Session | null> {
  if (!isSupabaseOAuthReturnUrl(url)) return null;
  if (oauthRedirectInFlight) return null;

  oauthRedirectInFlight = true;
  try {
    const { code, accessToken, refreshToken } = parseOAuthReturnUrl(url);

    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
      return data.session;
    }

    if (accessToken && refreshToken) {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) throw error;
      return data.session;
    }

    return null;
  } finally {
    oauthRedirectInFlight = false;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [awaitingPasswordReset, setAwaitingPasswordReset] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        await clearStoredGoogleTokens();
        setAwaitingPasswordReset(false);
      }
      // Quando o usuário clica no link de reset de senha, o Supabase
      // emite PASSWORD_RECOVERY. Guardamos esse estado para a UI exibir
      // a tela de redefinição de senha em vez de entrar no app direto.
      if (event === 'PASSWORD_RECOVERY') {
        setAwaitingPasswordReset(true);
      } else {
        setAwaitingPasswordReset(false);
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function runGoogleOAuth(forceConsent: boolean): Promise<Session | null> {
    const redirectUrl = Linking.createURL('google-auth');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
        queryParams: forceConsent
          ? { access_type: 'offline', prompt: 'consent' }
          : { prompt: 'select_account' },
      },
    });

    if (error) throw error;
    if (!data?.url) return null;

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl, {
      showInRecents: false,
    });

    if (result.type !== 'success' || !('url' in result) || !result.url) {
      return null;
    }

    return completeSupabaseOAuthFromUrl(result.url);
  }

  async function signInWithGoogle() {
    try {
      await runGoogleOAuth(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      if (message.toLowerCase().includes('pkce')) {
        Alert.alert(
          'Erro no login com Google',
          'Falha na validação de segurança (PKCE). Tente de novo: toque em Entrar com Google outra vez sem fechar o app no meio do processo.'
        );
        return;
      }
      Alert.alert('Erro no login com Google', message);
    }
  }

  async function reconnectGoogleForDrive(): Promise<boolean> {
    try {
      if (!isGoogleDriveConfigured()) {
        Alert.alert('Drive não configurado', getGoogleDriveSetupHint());
        return false;
      }
      await authorizeGoogleDriveDirect();
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      Alert.alert('Erro ao conectar Drive', message);
      return false;
    }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email: sanitizeEmail(email),
      password,
    });
    if (error) throw new Error(mapAuthError(error.message));
    // Não mexemos em setLoading aqui — o onAuthStateChange já faz isso.
  }

  async function signUp(email: string, password: string, name: string) {
    const { data, error } = await supabase.auth.signUp({
      email: sanitizeEmail(email),
      password,
      options: { 
        emailRedirectTo: Linking.createURL('auth-confirmed'),
        data: { 
          full_name: sanitizeName(name) 
        } 
      },
    });
    if (error) throw new Error(mapAuthError(error.message));
    // Se o Supabase retornar session nula (confirmação de e-mail obrigatória),
    // não tentamos autenticar — o RegisterScreen exibirá a tela de confirmação.
    if (!data.session) return; // aguarda confirmação por e-mail
  }

  async function signOut() {
    await clearStoredGoogleTokens();
    await supabase.auth.signOut();
  }

  const canChangePassword = useMemo(
    () => Boolean(user?.identities?.some(i => i.provider === 'email')),
    [user]
  );

  async function updateProfile(params: { fullName: string; avatarUrl?: string | null }) {
    const data: Record<string, string> = { full_name: sanitizeName(params.fullName) };
    if (params.avatarUrl !== undefined) {
      data.avatar_url = params.avatarUrl ?? '';
    }
    const { error } = await supabase.auth.updateUser({ data });
    if (error) throw new Error(mapAuthError(error.message));
  }

  async function updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(mapAuthError(error.message));
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        canChangePassword,
        awaitingPasswordReset,
        signIn,
        signUp,
        signInWithGoogle,
        reconnectGoogleForDrive,
        signOut,
        updateProfile,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function mapAuthError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (msg.includes('Email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
  if (msg.includes('User already registered')) return 'Este e-mail já está cadastrado.';
  if (msg.includes('Password should be at least')) return 'A senha deve ter ao menos 8 caracteres.';
  if (msg.includes('Unable to validate email')) return 'E-mail inválido.';
  if (msg.includes('rate limit')) return 'Muitas tentativas. Aguarde alguns minutos.';
  return 'Ocorreu um erro. Tente novamente.';
}