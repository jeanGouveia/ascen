import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../hooks/useAppTheme';
import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import { supabase } from '../services/supabase';
import { Card } from '../components/Shared';

export function DeleteAccountScreen() {
  const navigation = useNavigation<any>();
  const { C, s } = useAppTheme();
  const { user, signOut } = useAuth();
  const { role, familyId } = useFamily();
  const [busy, setBusy] = useState(false);

  const isOwner = role === 'owner';
  const now = new Date().toISOString();
  const deletionDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  async function handleDeleteAccount() {
    if (!user?.id) return;

    Alert.alert(
      'Confirmar exclusão',
      isOwner
        ? 'Sua conta, família e todos os dados serão marcados para exclusão e removidos em 30 dias. Esta ação não pode ser desfeita. Deseja continuar?'
        : 'Sua conta e todos os seus dados serão marcados para exclusão e removidos em 30 dias. Esta ação não pode ser desfeita. Deseja continuar?',
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
      // Soft delete: marca o usuário como pendente de exclusão
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ deleted_at: now })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Se for owner, marca a família inteira para exclusão
      if (isOwner && familyId) {
        const { error: familyError } = await supabase
          .from('families')
          .update({ deleted_at: now })
          .eq('id', familyId);

        if (familyError) throw familyError;
      }

      // Faz logout imediatamente após marcar para exclusão
      await signOut();

    } catch (err) {
      setBusy(false);
      Alert.alert(
        'Erro',
        'Não foi possível processar a exclusão. Tente novamente ou entre em contato com suporte@valtun.com.br.'
      );
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Ícone de alerta */}
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

        {/* O que será excluído */}
        <Card style={{ marginBottom: 14 }}>
          <Text style={[s.formLabel, { marginBottom: 12 }]}>O QUE SERÁ EXCLUÍDO</Text>

          {[
            { icon: '💰', text: 'Todos os seus lançamentos e transações' },
            { icon: '📂', text: 'Categorias personalizadas' },
            { icon: '🔁', text: 'Contas recorrentes configuradas' },
            { icon: '🎯', text: 'Metas financeiras' },
            { icon: '☁️', text: 'Backups na nuvem' },
            ...(isOwner
              ? [{ icon: '👨‍👩‍👧', text: 'Família e dados de todos os membros vinculados' }]
              : []),
            { icon: '👤', text: 'Seu perfil e credenciais de acesso' },
          ].map((item, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 10,
                marginBottom: i < 5 ? 10 : 0,
              }}
            >
              <Text style={{ fontSize: 16, marginTop: 1 }}>{item.icon}</Text>
              <Text style={[s.txMeta, { flex: 1, fontSize: 13 }]}>{item.text}</Text>
            </View>
          ))}
        </Card>

        {/* Prazo */}
        <Card style={{ marginBottom: 14, borderWidth: 1, borderColor: C.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <Text style={{ fontSize: 24 }}>📅</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.settingLabel, { marginBottom: 4 }]}>Exclusão em 30 dias</Text>
              <Text style={s.txMeta}>
                Seus dados serão removidos definitivamente a partir de{' '}
                <Text style={{ fontWeight: '700', color: C.text }}>{deletionDate}</Text>.
                Até lá você não poderá mais acessar a conta.
              </Text>
            </View>
          </View>
        </Card>

        {/* Aviso owner */}
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
              <Text style={{ fontSize: 20 }}>⚠️</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.settingLabel, { color: C.danger, marginBottom: 4 }]}>
                  Você é dono da família
                </Text>
                <Text style={[s.txMeta, { color: C.danger }]}>
                  Ao excluir sua conta, a família inteira e os dados de todos os membros vinculados também serão marcados para exclusão.
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Alternativa */}
        <Card style={{ marginBottom: 28 }}>
          <Text style={[s.formLabel, { marginBottom: 8 }]}>ANTES DE EXCLUIR</Text>
          <Text style={s.txMeta}>
            Se o problema for técnico ou tiver dúvidas, entre em contato:{' '}
            <Text style={{ color: C.primary, fontWeight: '600' }}>suporte@valtun.com.br</Text>
          </Text>
        </Card>

        {/* Botão de exclusão */}
        {busy ? (
          <View style={{ alignItems: 'center', paddingVertical: 16 }}>
            <ActivityIndicator color={C.danger} />
            <Text style={[s.txMeta, { marginTop: 8 }]}>Processando solicitação…</Text>
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
              Solicitar exclusão da conta
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
