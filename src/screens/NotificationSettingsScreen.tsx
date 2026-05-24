import React from 'react';
import { View, Text, ScrollView, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePreferences } from '../context/PreferencesContext';
import { useRecurring } from '../context/RecurringContext';
import { useAppTheme } from '../hooks/useAppTheme';
import { Card } from '../components/Shared';
import {
  scheduleRecurringNotifications,
  requestNotificationPermission,
} from '../services/notificationScheduler';

export function NotificationSettingsScreen() {
  const {
    notificationsEnabled,
    setNotificationsEnabled,
    notifyDayOf,
    setNotifyDayOf,
    notifyOneDayBefore,
    setNotifyOneDayBefore,
    notifyFiveDaysBefore,
    setNotifyFiveDaysBefore,
  } = usePreferences();
  const { rules } = useRecurring();
  const { C, s } = useAppTheme();

  const prefs = { notificationsEnabled, notifyDayOf, notifyOneDayBefore, notifyFiveDaysBefore };

  async function handleToggleMain(value: boolean) {
    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          'Permissão necessária',
          'Ative as notificações para o Ascen nas configurações do seu aparelho.'
        );
        return;
      }
    }
    setNotificationsEnabled(value);
    await scheduleRecurringNotifications(rules, { ...prefs, notificationsEnabled: value });
  }

  async function handleToggle(
    setter: (v: boolean) => void,
    key: keyof typeof prefs,
    value: boolean
  ) {
    setter(value);
    await scheduleRecurringNotifications(rules, { ...prefs, [key]: value });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text style={[s.pageSubtitle, { marginBottom: 16 }]}>
          Receba lembretes de vencimentos e recebimentos dos seus lançamentos recorrentes.
        </Text>

        <Card style={{ marginBottom: 14 }}>
          <View style={s.settingRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={s.settingLabel}>🔔 Notificações</Text>
              <Text style={s.txMeta}>Ativar ou desativar todos os lembretes</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={v => void handleToggleMain(v)}
              trackColor={{ false: C.border, true: C.primary }}
              thumbColor="#fff"
              ios_backgroundColor={C.border}
              accessibilityLabel="Notificações gerais"
            />
          </View>
        </Card>

        {notificationsEnabled && (
          <>
            <Text style={[s.formLabel, { marginBottom: 8 }]}>DESPESAS — ALERTAS DE VENCIMENTO</Text>
            <Card style={{ marginBottom: 14 }}>
              <View style={s.settingRow}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={s.settingLabel}>5 dias antes</Text>
                  <Text style={s.txMeta}>Aviso antecipado para se organizar</Text>
                </View>
                <Switch
                  value={notifyFiveDaysBefore}
                  onValueChange={v => void handleToggle(setNotifyFiveDaysBefore, 'notifyFiveDaysBefore', v)}
                  trackColor={{ false: C.border, true: C.primary }}
                  thumbColor="#fff"
                  ios_backgroundColor={C.border}
                  accessibilityLabel="Avisar 5 dias antes"
                />
              </View>

              <View style={[s.settingRow, { borderTopWidth: 1, borderTopColor: C.divider }]}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={s.settingLabel}>1 dia antes</Text>
                  <Text style={s.txMeta}>Lembrete na véspera do vencimento</Text>
                </View>
                <Switch
                  value={notifyOneDayBefore}
                  onValueChange={v => void handleToggle(setNotifyOneDayBefore, 'notifyOneDayBefore', v)}
                  trackColor={{ false: C.border, true: C.primary }}
                  thumbColor="#fff"
                  ios_backgroundColor={C.border}
                  accessibilityLabel="Avisar 1 dia antes"
                />
              </View>

              <View style={[s.settingRow, { borderTopWidth: 1, borderTopColor: C.divider }]}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={s.settingLabel}>No dia do vencimento</Text>
                  <Text style={s.txMeta}>Alerta na manhã do dia</Text>
                </View>
                <Switch
                  value={notifyDayOf}
                  onValueChange={v => void handleToggle(setNotifyDayOf, 'notifyDayOf', v)}
                  trackColor={{ false: C.border, true: C.primary }}
                  thumbColor="#fff"
                  ios_backgroundColor={C.border}
                  accessibilityLabel="Avisar no dia"
                />
              </View>
            </Card>

            <Text style={[s.formLabel, { marginBottom: 8 }]}>RECEITAS — AVISO DE RECEBIMENTO</Text>
            <Card style={{ marginBottom: 14 }}>
              <View style={s.settingRow}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={s.settingLabel}>No dia previsto</Text>
                  <Text style={s.txMeta}>
                    Lembrete quando uma receita recorrente estiver prevista para hoje
                  </Text>
                </View>
                <Switch
                  value={notifyDayOf}
                  onValueChange={v => void handleToggle(setNotifyDayOf, 'notifyDayOf', v)}
                  trackColor={{ false: C.border, true: C.primary }}
                  thumbColor="#fff"
                  ios_backgroundColor={C.border}
                  accessibilityLabel="Avisar no dia do recebimento"
                />
              </View>
            </Card>
          </>
        )}

        <Text style={{ textAlign: 'center', color: C.textMuted, fontSize: 12, marginTop: 8 }}>
          Os lembretes são gerados localmente e não dependem de internet.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
