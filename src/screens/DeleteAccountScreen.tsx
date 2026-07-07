import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../hooks/useAppTheme';
import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import { supabase } from '../services/supabase';
import { Card } from '../components/Shared';
import { deleteUserDatabase } from '../db/dbInstance';
import { removeLocalAvatar } from '../services/localAvatar';
import { purgeAllBackupDataForUser } from '../experimental/backup/services/backupPassphrase';
import { clearStoredGoogleTokens } from '../experimental/backup/services/googleAccessToken';
import { SUPPORT_EMAIL, DELETE_ACCOUNT_URL } from '../constants/legal';
import { logError } from '../services/sentry';

export function DeleteAccountScreen() {
  const navigation = useNavigation<any>();
  const { C, s } = useAppTheme();
  const { user, signOut } = useAuth();
  const { role } = useFamily();
  const [busy, setBusy] = useState(false);

  const isOwner = role === 'owner';

  async function handleDeleteAccount() {
    if (!user?.id) return;

    Alert.alert(
      'Confirmar exclusão',
      isOwner
        ? 'Sua conta, família e TODOS os dados serão excluídos IMEDIATAMENTE. Esta ação é permanente e irreversível. Deseja continuar?'
        : 'Sua conta e seus dados serão excluídos IMEDIATAMENTE. Esta ação é permanente e irreversível. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir minha conta',
          style: 'destructive',
          onPress: () => void confirmDeletion(),
        },
      ]
    );
  }

  async function confirmDeletion() {
    if (!user?.id) return;
    setBusy(true);

    try {
      // 1. Chamar Edge Function para deletar tudo no servidor
      const { error: fnError } = await supabase.functions.invoke('delete-account', {
        method: 'POST',
      });

      if (fnError) {
        throw fnError;
      }

      // 2. Limpar dados locais em paralelo
      await Promise.all([
        deleteUserDatabase(user.id),
        removeLocalAvatar(user.id),
        purgeAllBackupDataForUser(user.id),
        clearStoredGoogleTokens(),
      ]);

      // 3. signOut para limpar estado de sessão
      await signOut();
    } catch (err) {
      setBusy(false);
      const error = err instanceof Error ? err : new Error('Failed to delete account');
      logError(error, { context: 'confirmDeletion', userId: user.id });
      Alert.alert(
        'Erro ao excluir conta',
        `Não foi possível excluir sua conta. Tente novamente ou entre em contato com ${SUPPORT_EMAIL}.`
      );
    }
  }

  async function openWebDeletionPage() {
    try {
      await Linking.openURL(DELETE_ACCOUNT_URL);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to open deletion URL');
      logError(error, { context: 'openWebDeletionPage', url: DELETE_ACCOUNT_URL });
      Alert.alert(
        'Erro',
        'Não foi possível abrir a página. Acesse manualmente: valtun.com.br/excluir-conta'
      );
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'center', marginBottom: 24, marginTop: 8 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: C.dangerLight,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14,
            }}
          >
            <Text style={{ fontSize: 32 }}>🗑️</Text>
          </View>
          <Text style={[s.pageTitle, { textAlign: 'center', color: C.danger }]}>
            Excluir conta
          </Text>
          <Text style={[s.pageSubtitle, { textAlign: 'center', marginTop: 4 }]}>
            Esta ação é permanente e irreversível
          </Text>
        </View>

        <Card style={{ marginBottom: 14, borderWidth: 1, borderColor: C.danger, backgroundColor: C.dangerLight }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <Text style={{ fontSize: 20 }}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.settingLabel, { color: C.danger, marginBottom: 4 }]}>
                Exclusão imediata
              </Text>
              <Text style={[s.txMeta, { color: C.danger }]}>
                Ao confirmar, sua conta e todos os dados associados serão excluídos IMEDIATAMENTE dos nossos servidores e deste aparelho. Não há como desfazer.
              </Text>
            </View>
          </View>
        </Card>

        <Card style={{ marginBottom: 14 }}>
          <Text style={[s.formLabel, { marginBottom: 12 }]}>O QUE SERÁ EXCLUÍDO</Text>

          {[
            { icon: '💰', text: 'Todos os seus lançamentos e transações' },
            { icon: '📂', text: 'Categorias personalizadas' },
            { icon: '🔁', text: 'Contas recorrentes configuradas' },
            { icon: '🎯', text: 'Metas financeiras (locais)' },
            { icon: '☁️', text: 'Backups cifrados na nuvem' },
            ...(isOwner
              ? [{ icon: '👨‍👩‍👧', text: 'Família e dados de todos os membros vinculados' }]
              : []),
            { icon: '📱', text: 'Dados locais deste aparelho (cache, avatar, etc.)' },
            { icon: '👤', text: 'Seu perfil e credenciais de acesso' },
          ].map((item, i, arr) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 10,
                marginBottom: i < arr.length - 1 ? 10 : 0,
              }}
            >
              <Text style={{ fontSize: 16, marginTop: 1 }}>{item.icon}</Text>
              <Text style={[s.txMeta, { flex: 1, fontSize: 13 }]}>{item.text}</Text>
            </View>
          ))}
        </Card>

        {isOwner && (
          <Card
            style={{
              marginBottom: 14,
              borderWidth: 1,
              borderColor: C.danger,
              backgroundColor: C.dangerLight,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <Text style={{ fontSize: 20 }}>👨‍👩‍👧</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.settingLabel, { color: C.danger, marginBottom: 4 }]}>
                  Você é dono da família
                </Text>
                <Text style={[s.txMeta, { color: C.danger }]}>
                  Ao excluir sua conta, a família inteira e os dados de todos os membros vinculados também serão excluídos.
                </Text>
              </View>
            </View>
          </Card>
        )}

        <Card style={{ marginBottom: 14 }}>
          <Text style={[s.formLabel, { marginBottom: 8 }]}>EXCLUSÃO PELA WEB</Text>
          <Text style={[s.txMeta, { marginBottom: 12 }]}>
            Prefere excluir pela web? Você também pode solicitar a exclusão da sua conta através do nosso site.
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => void openWebDeletionPage()}
            style={[s.modalBtn, { backgroundColor: C.card, borderWidth: 1, borderColor: C.primary }]}
          >
            <Text style={{ color: C.primary, fontWeight: '700', fontSize: 14, textAlign: 'center' }}>
              Abrir página de exclusão web ↗
            </Text>
          </TouchableOpacity>
        </Card>

        <Card style={{ marginBottom: 28 }}>
          <Text style={[s.formLabel, { marginBottom: 8 }]}>ANTES DE EXCLUIR</Text>
          <Text style={s.txMeta}>
            Se o problema for técnico ou tiver dúvidas, entre em contato:{' '}
            <Text style={{ color: C.primary, fontWeight: '600' }}>{SUPPORT_EMAIL}</Text>
          </Text>
        </Card>

        {busy ? (
          <View style={{ alignItems: 'center', paddingVertical: 16 }}>
            <ActivityIndicator color={C.danger} />
            <Text style={[s.txMeta, { marginTop: 8 }]}>Excluindo conta e dados…</Text>
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => void handleDeleteAccount()}
            style={[
              s.modalBtn,
              {
                backgroundColor: C.danger,
                marginBottom: 12,
              },
            ]}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
              Excluir minha conta agora
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}
          style={[s.modalBtn, { backgroundColor: C.card }]}
          disabled={busy}
        >
          <Text style={{ color: C.textMuted, fontWeight: '600', fontSize: 15 }}>
            Cancelar
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}