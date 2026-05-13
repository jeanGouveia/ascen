import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../hooks/useAppTheme';
import { usePreferences } from '../context/PreferencesContext';
import { Card } from '../components/Shared';
import { useAuth } from '../context/AuthContext';

type ProfileMenuItem = {
  icon: string;
  label: string;
  sub: string;
  route?: string | null;
  onPress?: () => void;
};

export function ProfileScreen() {
  const { user, signOut } = useAuth();
  const navigation = useNavigation<any>();
  const { C, s } = useAppTheme();
  const { darkMode, setDarkMode, fontScale, setFontScale } = usePreferences();

  const meta = user?.user_metadata as Record<string, string | undefined> | undefined;
  const displayName = meta?.full_name || 'Usuário';
  const avatarUrl = meta?.avatar_url;

  const menuSections: { title: string; items: ProfileMenuItem[] }[] = [
    {
      title: 'CONTA',
      items: [
        { icon: '👤', label: 'Meu perfil', sub: 'Nome e foto de exibição', route: 'EditProfile' },
        { icon: '🔒', label: 'Alterar senha', sub: 'Contas com login por e-mail', route: 'ChangePassword' },
      ],
    },
    {
      title: 'NOTIFICAÇÕES',
      items: [{ icon: '🔔', label: 'Alertas e lembretes', sub: 'Interruptor geral e futuras opções', route: 'NotificationSettings' }],
    },
    {
      title: 'DADOS',
      items: [
        {
          icon: '📤',
          label: 'Exportar CSV',
          sub: 'Baixar seus lançamentos',
          route: null,
          onPress: () =>
            Alert.alert(
              'Exportar CSV',
              'A exportação será configurada em breve (formato, período e filtros). Por enquanto use os relatórios na aba Relatórios.'
            ),
        },
        { icon: '🏷️', label: 'Categorias', sub: 'Gerenciar categorias', route: 'Categorias' },
      ],
    },
    {
      title: 'SUPORTE',
      items: [
        { icon: '❓', label: 'Ajuda', sub: 'Como usar o Ascen', route: null },
        { icon: '⭐', label: 'Avaliar o app', sub: 'Nos ajude a melhorar', route: null },
      ],
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={s.profileCard}>
          <View style={s.profileAvatar}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={{ width: 80, height: 80, borderRadius: 40 }} resizeMode="cover" />
            ) : (
              <Text style={{ fontSize: 36 }}>👤</Text>
            )}
          </View>
          <Text style={s.profileName}>{displayName}</Text>
          <Text style={s.txMeta}>{user?.email}</Text>
          <View style={[s.chip, { marginTop: 10, alignSelf: 'center', backgroundColor: C.primaryLight, borderColor: C.primary }]}>
            <Text style={{ color: C.primary, fontWeight: '700', fontSize: 12 }}>✨ Plano Gratuito</Text>
          </View>
        </View>

        <Card style={{ marginBottom: 14 }}>
          <Text style={[s.formLabel, { marginBottom: 12 }]}>TAMANHO DA FONTE (ACESSIBILIDADE)</Text>
          <View style={{ flexDirection: 'row', gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Tamanho da fonte">
            {(['small', 'medium', 'large'] as const).map(sz => (
              <TouchableOpacity
                key={sz}
                onPress={() => setFontScale(sz)}
                activeOpacity={0.8}
                accessibilityRole="radio"
                accessibilityState={{ selected: fontScale === sz }}
                accessibilityLabel={sz === 'small' ? 'Fonte pequena' : sz === 'medium' ? 'Fonte média' : 'Fonte grande'}
                style={[s.chip, { flex: 1, justifyContent: 'center' }, fontScale === sz && { backgroundColor: C.primary, borderColor: C.primary }]}
              >
                <Text style={[s.chipText, { fontSize: sz === 'small' ? 13 : sz === 'large' ? 17 : 15 }, fontScale === sz && { color: '#fff' }]}>
                  {sz === 'small' ? 'Pequena' : sz === 'medium' ? 'Média' : 'Grande'}
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
                  activeOpacity={0.7}
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
          Ascen v1.0.0 · Feito com ❤️ no Brasil
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
