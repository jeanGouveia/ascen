import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSession } from '../context/SessionContext';
import { useAppTheme } from '../hooks/useAppTheme';

export function SessionLockScreen() {
  const { unlock } = useSession();
  const { C } = useAppTheme();

  return (
    <View style={[styles.overlay, { backgroundColor: C.bg }]}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: C.card }]}>
          <Text style={[styles.icon, { color: C.primary }]}>🔒</Text>
        </View>
        <Text style={[styles.title, { color: C.text }]}>Sessão bloqueada</Text>
        <Text style={[styles.message, { color: C.textMuted }]}>
          Por segurança, sua sessão foi bloqueada devido à inatividade.
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: C.primary }]}
          onPress={unlock}
        >
          <Text style={styles.buttonText}>Desbloquear</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
    maxWidth: 400,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  button: {
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 200,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
