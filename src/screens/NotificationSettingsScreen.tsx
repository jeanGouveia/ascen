import React from 'react';
import { View, Text, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePreferences } from '../context/PreferencesContext';
import { useAppTheme } from '../hooks/useAppTheme';
import { Card } from '../components/Shared';

export function NotificationSettingsScreen() {
  const { notificationsEnabled, setNotificationsEnabled } = usePreferences();
  const { C, s } = useAppTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text style={[s.pageSubtitle, { marginBottom: 16 }]}>
          Aqui você poderá ajustar lembretes por tipo de lançamento, horários e canais. Por enquanto há apenas o interruptor principal.
        </Text>

        <Card>
          <View style={s.settingRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={s.settingLabel}>Notificações no app</Text>
              <Text style={s.txMeta}>Ativa ou desativa alertas gerais (base para futuras opções)</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: C.border, true: C.primary }}
              thumbColor="#fff"
              ios_backgroundColor={C.border}
              accessibilityLabel="Notificações no app"
            />
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
