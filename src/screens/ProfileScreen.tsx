import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Image,
  ActivityIndicator,
  TextInput,
  Linking,
} from 'react-native';
import * as StoreReview from 'expo-store-review';
import Constants from 'expo-constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAppTheme } from '../hooks/useAppTheme';
import { usePreferences } from '../context/PreferencesContext';
import { Card } from '../components/Shared';
import { useAuth } from '../context/AuthContext';
import { useSession } from '../context/SessionContext';
import { useUserLocal } from '../context/UserLocalDataContext';
import { useFamily } from '../context/FamilyContext';
import { initialSync } from '../services/sync/syncEngine';
import { sanitizeGenericText } from '../utils/inputSanitizer';
import { logError } from '../services/sentry';

type ProfileMenuItem = {
  icon: string;
  label: string;
  sub: string;
  route?: string | null;
  onPress?: () => void;
};

function isLegacyRemoteAvatar(url?: string): boolean {
  return Boolean(url && (url.startsWith('http://') || url.startsWith('https://')));
}

export function ProfileScreen() {
  const { user, signOut } = useAuth();
  const navigation = useNavigation<any>();
  const { C, s } = useAppTheme();
  const { darkMode, setDarkMode, fontScale, setFontScale } = usePreferences();
  const { localAvatarUri, bumpDataRevision } = useUserLocal();
  const { joinCode, role, joinByCode, refreshFamily } = useFamily();
  const { touch } = useSession();

  const [busy, setBusy] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');

  // Reset timer when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      touch();
    }, [touch])
  );

  const meta = user?.user_metadata as Record<string, string | undefined> | undefined;
  const displayName = meta?.full_name || 'Usuário';
  const legacyAvatar = isLegacyRemoteAvatar(meta?.avatar_url) ? meta?.avatar_url : undefined;
  const avatarUrl = localAvatarUri || legacyAvatar;

  const handleJoinFamily = async () => {
    const sanitizedCode = sanitizeGenericText(joinCodeInput);
    if (!user?.id || !sanitizedCode) {
      Alert.alert('Código', 'Digite o código de 8 caracteres.');
      return;
    }
    setBusy(true);
    try {
      await joinByCode(sanitizedCode);
      await initialSync(user.id);
      bumpDataRevision();
      await refreshFamily();
      Alert.alert(
        'Você entrou na família',
        'Os lançamentos compartilhados serão sincronizados automaticamente quando houver internet.'
      );
    } catch (e) {
      const error = e instanceof Error ? e : new Error('Failed to join family');
      logError(error, { context: 'handleJoinFamily', code: sanitizedCode });
      Alert.alert('Falha', 'Não foi possível entrar na família. Verifique o código e tente novamente.');
    } finally {
      setBusy(false);
    }
  };

  const menuSections: { title: string; items: ProfileMenuItem[] }[] = [
    {
      title: 'CONTA',
      items: [
        { icon: '👤', label: 'Meu perfil', sub: 'Nome e foto de exibição', route: 'EditProfile' },
        { icon: '🔒', label: 'Alterar senha', sub: 'Contas com login por e-mail', route: 'ChangePassword' },
        { icon: '🗑️', label: 'Excluir conta', sub: 'Solicitar remoção dos seus dados', route: 'DeleteAccount' },
      ],
    },
    {
      title: 'NOTIFICAÇÕES',
      items: [
        {
          icon: '🔔',
          label: 'Alertas e lembretes',
          sub: 'Lembretes de vencimentos e recebimentos',
          route: 'NotificationSettings',
        },
      ],
    },
    {
      title: 'DADOS',
      items: [{ icon: '🏷️', label: 'Categorias', sub: 'Gerenciar categorias', route: 'Categorias' }],
    },
    {
      title: 'SUPORTE',
      items: [
        { icon: '❓', label: 'Ajuda', sub: 'Como usar o Ascen', route: 'Ajuda' },
        {
          icon: '⭐',
          label: 'Avaliar o app',
          sub: 'Nos ajude a melhorar',
          route: null,
          onPress: async () => {
            if (await StoreReview.hasAction()) {
              await StoreReview.requestReview();
            } else {
              await Linking.openURL(
                'https://play.google.com/store/apps/details?id=com.valtun.ascen'
              );
            }
          },
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={[s.pageTitle, { marginBottom: 4 }]}>Ajustes</Text>
        <Text style={[s.pageSubtitle, { marginBottom: 16 }]}>Conta e preferências</Text>

        {busy && (
          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            <ActivityIndicator color={C.primary} />
            <Text style={{ marginTop: 6, color: C.textMuted, fontSize: 13 }}>Processando…</Text>
          </View>
        )}

        <View style={s.profileCard}>
          <View style={s.profileAvatar}>
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={{ width: 80, height: 80, borderRadius: 40 }}
                resizeMode="cover"
              />
            ) : (
              <Text style={{ fontSize: 36 }}>👤</Text>
            )}
          </View>
          <Text style={s.profileName}>{displayName}</Text>
          <Text style={s.txMeta}>{user?.email}</Text>

          {role === 'owner' && joinCode ? (
            <View
              style={{
                marginTop: 14,
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 12,
                backgroundColor: C.primaryLight,
                borderWidth: 1,
                borderColor: C.primary,
                alignSelf: 'stretch',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: C.primary, letterSpacing: 1, marginBottom: 4 }}>
                CÓDIGO DA FAMÍLIA
              </Text>
              <Text
                selectable
                style={{ fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: 3 }}
              >
                {joinCode}
              </Text>
              <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 6, textAlign: 'center' }}>
                Compartilhe com quem deve ver os mesmos lançamentos
              </Text>
            </View>
          ) : role === 'member' ? (
            <Text style={[s.txMeta, { marginTop: 10 }]}>Membro · lançamentos compartilhados</Text>
          ) : null}

          <View
            style={[
              s.chip,
              { marginTop: 10, alignSelf: 'center', backgroundColor: C.primaryLight, borderColor: C.primary },
            ]}
          >
            <Text style={{ color: C.primary, fontWeight: '700', fontSize: 12 }}>✨ Plano Gratuito</Text>
          </View>
        </View>

        {role !== 'member' && (
          <Card style={{ marginBottom: 14 }}>
            <Text style={[s.formLabel, { marginBottom: 8 }]}>ENTRAR EM UMA FAMÍLIA</Text>
            <Text style={[s.txMeta, { marginBottom: 10 }]}>
              Se outra pessoa já criou uma conta e quer compartilhar os lançamentos com você, peça o código de 8 letras dela e cole aqui.
            </Text>
            <TextInput
              value={joinCodeInput}
              onChangeText={(t) => {
                setJoinCodeInput(t.toUpperCase());
                touch();
              }}
              placeholder="Código de 8 letras"
              placeholderTextColor={C.textMuted}
              autoCapitalize="characters"
              maxLength={8}
              style={{
                borderWidth: 1,
                borderColor: C.border,
                borderRadius: 10,
                padding: 12,
                color: C.text,
                marginBottom: 10,
              }}
            />
            <TouchableOpacity
              onPress={() => void handleJoinFamily()}
              style={[s.modalBtn, { backgroundColor: C.primary }]}
              disabled={busy}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Vincular com código</Text>
            </TouchableOpacity>
          </Card>
        )}

        <Card style={{ marginBottom: 14 }}>
          <Text style={[s.formLabel, { marginBottom: 12 }]}>TAMANHO DA FONTE (ACESSIBILIDADE)</Text>
          <View
            style={{ flexDirection: 'row', gap: 6 }}
            accessibilityRole="radiogroup"
            accessibilityLabel="Tamanho da fonte"
          >
            {(['small', 'medium', 'large', 'xlarge'] as const).map(sz => (
              <TouchableOpacity
                key={sz}
                onPress={() => setFontScale(sz)}
                activeOpacity={0.8}
                accessibilityRole="radio"
                accessibilityState={{ selected: fontScale === sz }}
                accessibilityLabel={
                  sz === 'small'
                    ? 'Fonte pequena'
                    : sz === 'medium'
                      ? 'Fonte média'
                      : sz === 'large'
                        ? 'Fonte grande'
                        : 'Fonte extra grande'
                }
                style={[
                  s.chip,
                  { flex: 1, justifyContent: 'center', paddingHorizontal: 6 },
                  fontScale === sz && { backgroundColor: C.primary, borderColor: C.primary },
                ]}
              >
                <Text
                  style={[
                    s.chipText,
                    {
                      fontSize:
                        sz === 'small' ? 12 : sz === 'medium' ? 14 : sz === 'large' ? 16 : 18,
                    },
                    fontScale === sz && { color: '#fff' },
                  ]}
                >
                  {sz === 'small'
                    ? 'Pequena'
                    : sz === 'medium'
                      ? 'Média'
                      : sz === 'large'
                        ? 'Grande'
                        : 'Extra'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <Card style={{ marginBottom: 14 }}>
          <View style={s.settingRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={s.settingLabel}>🌙 Modo escuro</Text>
              <Text style={s.txMeta}>Tema escuro em todo o app</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: C.border, true: C.primary }}
              thumbColor="#fff"
              ios_backgroundColor={C.border}
              accessibilityLabel="Modo escuro"
            />
          </View>
        </Card>

        {menuSections.map(sec => (
          <View key={sec.title} style={{ marginBottom: 14 }}>
            <Text style={[s.formLabel, { marginBottom: 8 }]}>{sec.title}</Text>
            <Card>
              {sec.items.map((item, i) => (
                <TouchableOpacity
                  key={item.label}
                  activeOpacity={item.onPress ? 0.7 : 1}
                  style={[s.settingRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.divider }]}
                  onPress={() => {
                    if (item.onPress) {
                      item.onPress();
                    } else if (item.route) {
                      navigation.navigate(item.route);
                    } else {
                      Alert.alert(item.label, 'Funcionalidade em breve!');
                    }
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Text style={{ fontSize: 22 }}>{item.icon}</Text>
                    <View>
                      <Text style={s.settingLabel}>{item.label}</Text>
                      <Text style={s.txMeta}>{item.sub}</Text>
                    </View>
                  </View>
                  <Text style={{ color: C.textMuted, fontSize: 20 }}>›</Text>
                </TouchableOpacity>
              ))}
            </Card>
          </View>
        ))}

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() =>
            Alert.alert('Sair da conta', 'Deseja realmente sair?', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Sair', style: 'destructive', onPress: signOut },
            ])
          }
          style={[s.modalBtn, { backgroundColor: C.dangerLight, marginTop: 6 }]}
        >
          <Text style={{ color: C.danger, fontWeight: '700', fontSize: 16 }}>🚪 Sair da conta</Text>
        </TouchableOpacity>

        <Text style={{ textAlign: 'center', color: C.textMuted, fontSize: 12, marginTop: 24 }}>
          Ascen v{Constants.expoConfig?.version ?? '1.0.0'} · Feito com ❤️ no Brasil
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}