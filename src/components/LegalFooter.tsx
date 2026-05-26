import React from 'react';
import { Text, Linking, StyleSheet } from 'react-native';
import { C_light as C } from '../styles/theme';
import { PRIVACY_URL } from '../constants/legal';

export function LegalFooter({ prefix }: { prefix: string }) {
  return (
    <Text style={styles.legal}>
      {prefix}
      {'\n'}
      <Text
        style={styles.link}
        onPress={() => { if (PRIVACY_URL) void Linking.openURL(PRIVACY_URL); }}
        accessibilityRole="link"
        accessibilityLabel="Termos de Uso e Política de Privacidade"
      >
        Termos de Uso e Política de Privacidade
      </Text>
      .
    </Text>
  );
}

const styles = StyleSheet.create({
  legal: {
    textAlign: 'center',
    fontSize: 11,
    color: C.textMuted,
    marginTop: 20,
    lineHeight: 16,
  },
  link: {
    color: C.primary,
    textDecorationLine: 'underline',
  },
});
