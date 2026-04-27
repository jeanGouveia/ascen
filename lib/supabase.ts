// ============================================================
// ARQUIVO 1: lib/supabase.ts
// Cole em: ascen/lib/supabase.ts
// ============================================================

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// ⚠️  Substitua pelos valores do seu projeto no Supabase Dashboard
// Settings → API → Project URL e anon public key
const SUPABASE_URL  = 'https://dvgkpoiaktlvqllxfxzt.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2Z2twb2lha3RsdnFsbHhmeHp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4ODQ4MjMsImV4cCI6MjA5MjQ2MDgyM30._FTiC1e8vMtCxdeAxmS_fF9OzhWUUDRWT-Q2NyqZf_4';

// Adapter seguro: armazena tokens no Keychain (iOS) / Keystore (Android)
// Nunca no AsyncStorage que é texto puro
const ExpoSecureStoreAdapter = {
  getItem:    (key: string) => SecureStore.getItemAsync(key),
  setItem:    (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    storage:          ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession:   true,
    detectSessionInUrl: false, // obrigatório em React Native
  },
});
