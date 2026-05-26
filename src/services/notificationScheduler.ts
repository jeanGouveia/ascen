import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { RecurringRule } from '../context/RecurringContext';
import { dateForRuleInMonth } from '../utils/recurringDates';

export interface NotificationPrefs {
  notificationsEnabled: boolean;
  notifyDayOf: boolean;
  notifyOneDayBefore: boolean;
  notifyFiveDaysBefore: boolean;
}

const NOTIFICATION_TAG = 'ascen_recurring';

/** Solicita permissão ao sistema. Retorna true se concedida. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/** Cancela todas as notificações agendadas pelo Ascen e re-agenda para o mês atual e o próximo. */
export async function scheduleRecurringNotifications(
  rules: RecurringRule[],
  prefs: NotificationPrefs
): Promise<void> {
  if (Platform.OS === 'web') return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const ours = scheduled.filter(n => n.content.data?.tag === NOTIFICATION_TAG);
  await Promise.all(ours.map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)));

  if (!prefs.notificationsEnabled) return;

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const months: Array<{ year: number; month: number }> = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(currentYear, currentMonth - 1 + i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }

  const activeRules = rules.filter(r => r.active);

  for (const { year, month } of months) {
    for (const rule of activeRules) {
      const dueDateStr = dateForRuleInMonth(rule, year, month);
      const dueDate = new Date(`${dueDateStr}T09:00:00`);

      const isExpense = rule.type === 'expense';
      const amountStr = rule.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

      if (isExpense) {
        if (prefs.notifyFiveDaysBefore) {
          const triggerDate = new Date(dueDate);
          triggerDate.setDate(triggerDate.getDate() - 5);
          if (triggerDate > now) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: '📅 Vencimento em 5 dias',
                body: `${rule.description} · ${amountStr}`,
                data: { tag: NOTIFICATION_TAG, ruleId: rule.id },
              },
              trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
            });
          }
        }

        if (prefs.notifyOneDayBefore) {
          const triggerDate = new Date(dueDate);
          triggerDate.setDate(triggerDate.getDate() - 1);
          if (triggerDate > now) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: '⚠️ Vencimento amanhã',
                body: `${rule.description} · ${amountStr}`,
                data: { tag: NOTIFICATION_TAG, ruleId: rule.id },
              },
              trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
            });
          }
        }

        if (prefs.notifyDayOf && dueDate > now) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: '🔴 Vence hoje',
              body: `${rule.description} · ${amountStr}`,
              data: { tag: NOTIFICATION_TAG, ruleId: rule.id },
            },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: dueDate },
          });
        }
      } else if (prefs.notifyDayOf && dueDate > now) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '💚 Recebimento previsto hoje',
            body: `${rule.description} · ${amountStr}`,
            data: { tag: NOTIFICATION_TAG, ruleId: rule.id },
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: dueDate },
        });
      }
    }
  }
}
