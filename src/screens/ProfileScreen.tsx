import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, s } from '../styles/theme';
import { Card } from '../components/Shared';
import { useAuth } from '../context/AuthContext';

export function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');

  const menuSections = [
    {
      title: 'CONTA',
      items: [
        { icon: '👤', label: 'Meu Perfil', sub: 'Editar nome e foto' },
        { icon: '🔒', label: 'Alterar Senha', sub: 'Segurança da conta' },
      ],
    },
    {
      title: 'DADOS',
      items: [
        { icon: '📤', label: 'Exportar CSV', sub: 'Baixar seus lançamentos' },
        { icon: '🏷️', label: 'Categorias', sub: 'Gerenciar categorias' },
        { icon: '🔄', label: 'Contas Recorrentes', sub: 'Assinaturas e contas fixas' },
      ],
    },
    {
      title: 'SUPORTE',
      items: [
        { icon: '❓', label: 'Ajuda', sub: 'Como usar o Ascen' },
        { icon: '⭐', label: 'Avaliar o app', sub: 'Nos ajude a melhorar' },
      ],
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={s.profileCard}>
          <View style={s.profileAvatar}>
            <Text style={{ fontSize: 36 }}>👤</Text>
          </View>
          <Text style={s.profileName}>{user?.user_metadata?.full_name || 'Usuário'}</Text>
          <Text style={s.txMeta}>{user?.email}</Text>
          <View
            style={[
              s.chip,
              { marginTop: 10, alignSelf: 'center', backgroundColor: C.primaryLight, borderColor: C.primary },
            ]}
          >
            <Text style={{ color: C.primary, fontWeight: '700', fontSize: 12 }}>✨ Plano Gratuito</Text>
          </View>
        </View>

        <Card style={{ marginBottom: 14 }}>
          <Text style={[s.formLabel, { marginBottom: 12 }]}>TAMANHO DA FONTE (ACESSIBILIDADE)</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['small', 'medium', 'large'] as const).map(sz => (
              <TouchableOpacity
                key={sz}
                onPress={() => setFontSize(sz)}
                activeOpacity={0.8}
                style={[
                  s.chip,
                  { flex: 1, justifyContent: 'center' },
                  fontSize === sz && { backgroundColor: C.primary, borderColor: C.primary },
                ]}
              >
                <Text
                  style={[
                    s.chipText,
                    { fontSize: sz === 'small' ? 13 : sz === 'large' ? 17 : 15 },
                    fontSize === sz && { color: '#fff' },
                  ]}
                >
                  {sz === 'small' ? 'Pequena' : sz === 'medium' ? 'Média' : 'Grande'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <Card style={{ marginBottom: 14 }}>
          <View style={s.settingRow}>
            <View>
              <Text style={s.settingLabel}>🌙 Modo escuro</Text>
              <Text style={s.txMeta}>Tema escuro do app</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: C.border, true: C.primary }}
              thumbColor="#fff"
              ios_backgroundColor={C.border}
            />
          </View>
          <View style={[s.settingRow, { borderTopWidth: 1, borderTopColor: C.divider, marginTop: 4, paddingTop: 14 }]}>
            <View>
              <Text style={s.settingLabel}>🔔 Notificações</Text>
              <Text style={s.txMeta}>Alertas de vencimento</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: C.border, true: C.primary }}
              thumbColor="#fff"
              ios_backgroundColor={C.border}
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
                  onPress={() => Alert.alert(item.label, 'Funcionalidade em breve!')}
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
