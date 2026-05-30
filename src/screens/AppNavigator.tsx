import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppTheme } from '../hooks/useAppTheme';
import { HomeScreen } from './HomeScreen';
import { TransactionsScreen } from './TransactionsScreen';
import { ReportsScreen } from './ReportsScreen';
import { GoalsScreen } from './GoalsScreen';
import { ProfileScreen } from './ProfileScreen';
import { CategoryScreen } from './CategoryScreen';
import { RecurringScreen } from './RecurringScreen';
import { EditProfileScreen } from './EditProfileScreen';
import { ChangePasswordScreen } from './ChangePasswordScreen';
import { NotificationSettingsScreen } from './NotificationSettingsScreen';
import { HelpScreen } from './HelpScreen';
import { DeleteAccountScreen } from './DeleteAccountScreen';
import { useRecurring } from '../context/RecurringContext';
import { usePreferences } from '../context/PreferencesContext';
import { scheduleRecurringNotifications } from '../services/notificationScheduler';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabIcon({
  emoji,
  focused,
  label,
}: {
  emoji: string;
  focused: boolean;
  label: string;
}) {
  const { C, s } = useAppTheme();
  return (
    <View
      style={[s.tabIconWrap, focused && { backgroundColor: C.primaryLight }]}
      accessibilityRole="image"
      accessibilityLabel={label}
    >
      <Text style={{ fontSize: 20 }}>{emoji}</Text>
    </View>
  );
}

function TabNavigator() {
  const { C, s } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { rules } = useRecurring();
  const { notificationsEnabled, notifyDayOf, notifyOneDayBefore, notifyFiveDaysBefore } = usePreferences();

  useEffect(() => {
    void scheduleRecurringNotifications(rules, {
      notificationsEnabled,
      notifyDayOf,
      notifyOneDayBefore,
      notifyFiveDaysBefore,
    });
  }, [rules, notificationsEnabled, notifyDayOf, notifyOneDayBefore, notifyFiveDaysBefore]);

  const tabBarHeight = 64 + insets.bottom;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: [s.tabBar, { height: tabBarHeight, paddingBottom: insets.bottom + 4 }],
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.textMuted,
        tabBarLabelStyle: s.tabLabel,
        tabBarItemStyle: { paddingVertical: 4 },
      }}
    >
      <Tab.Screen
        name="Início"
        component={HomeScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} label="Início" /> }}
      />
      <Tab.Screen
        name="Lançamentos"
        component={TransactionsScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} label="Lançamentos" /> }}
      />
      <Tab.Screen
        name="Relatórios"
        component={ReportsScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📊" focused={focused} label="Relatórios" /> }}
      />
      <Tab.Screen
        name="Metas"
        component={GoalsScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🎯" focused={focused} label="Metas" /> }}
      />
      <Tab.Screen
        name="Ajustes"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Ajustes',
          tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused} label="Ajustes" />,
        }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Screen name="Categorias" component={CategoryScreen} options={{ presentation: 'card', animation: 'slide_from_right' }} />
      <Stack.Screen name="Recorrentes" component={RecurringScreen} options={{ presentation: 'card', animation: 'slide_from_right' }} />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ headerShown: true, title: 'Meu perfil', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ headerShown: true, title: 'Alterar senha', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{ headerShown: true, title: 'Notificações', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="Ajuda"
        component={HelpScreen}
        options={{ headerShown: true, title: 'Ajuda', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="DeleteAccount"
        component={DeleteAccountScreen}
        options={{ headerShown: true, title: 'Excluir conta', animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
}