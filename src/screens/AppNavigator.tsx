import React from 'react';
import { View, Text } from 'react-native';
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

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  const { C, s } = useAppTheme();
  return (
    <View style={[s.tabIconWrap, focused && { backgroundColor: C.primaryLight }]}>
      <Text style={{ fontSize: 20 }}>{emoji}</Text>
    </View>
  );
}

function TabNavigator() {
  const { C, s } = useAppTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: s.tabBar,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.textMuted,
        tabBarLabelStyle: s.tabLabel,
        tabBarItemStyle: { paddingVertical: 4 },
      }}
    >
      <Tab.Screen name="Início" component={HomeScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} /> }} />
      <Tab.Screen name="Lançamentos" component={TransactionsScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} /> }} />
      <Tab.Screen name="Relatórios" component={ReportsScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📊" focused={focused} /> }} />
      <Tab.Screen name="Metas" component={GoalsScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🎯" focused={focused} /> }} />
      <Tab.Screen
        name="Configurações"
        component={ProfileScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused} /> }}
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
    </Stack.Navigator>
  );
}
