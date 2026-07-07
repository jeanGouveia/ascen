import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Linking,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import Constants from 'expo-constants';
import { useAppTheme } from '../hooks/useAppTheme';
import { PRIVACY_URL, TERMS_URL, SUPPORT_EMAIL, DPO_EMAIL, LEGAL_VERSION, LEGAL_EFFECTIVE_DATE } from '../constants/legal';

export function AboutScreen() {
  const { C, s } = useAppTheme();

  const openLink = (url: string) => {
    if (url) void Linking.openURL(url);
  };

  const sendEmail = (email: string) => {
    const mailtoUrl = `mailto:${email}`;
    void Linking.openURL(mailtoUrl);
  };

  const InfoRow = ({ label, value, onPress }: { label: string; value: string; onPress?: () => void }) => (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: C.textMid }]}>{label}</Text>
      {onPress ? (
        <TouchableOpacity onPress={onPress}>
          <Text style={[styles.infoValue, { color: C.primary }]}>{value}</Text>
        </TouchableOpacity>
      ) : (
        <Text style={[styles.infoValue, { color: C.text }]}>{value}</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[s.pageTitle, { marginBottom: 4 }]}>Sobre</Text>
        <Text style={[s.pageSubtitle, { marginBottom: 24 }]}>Informações do aplicativo</Text>

        <View style={[styles.section, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Versão</Text>
          <InfoRow label="Versão" value={Constants.expoConfig?.version ?? '1.0.0'} />
          <InfoRow label="Build" value={String(Constants.expoConfig?.android?.versionCode ?? 1)} />
        </View>

        <View style={[styles.section, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Legal</Text>
          <InfoRow
            label="Política de Privacidade"
            value="Ver documento"
            onPress={() => openLink(PRIVACY_URL)}
          />
          <InfoRow
            label="Termos de Uso"
            value="Ver documento"
            onPress={() => openLink(TERMS_URL)}
          />
          <InfoRow label="Versão dos termos" value={LEGAL_VERSION} />
          <InfoRow label="Vigência desde" value={LEGAL_EFFECTIVE_DATE} />
        </View>

        <View style={[styles.section, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Contato</Text>
          <InfoRow
            label="Suporte"
            value={SUPPORT_EMAIL}
            onPress={() => sendEmail(SUPPORT_EMAIL)}
          />
          <InfoRow
            label="Encarregado (DPO)"
            value={DPO_EMAIL}
            onPress={() => sendEmail(DPO_EMAIL)}
          />
        </View>

        <View style={[styles.section, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Desenvolvedor</Text>
          <InfoRow label="Nome" value="Valtun" />
          <InfoRow label="Pacote" value="com.valtun.ascen" />
        </View>

        <Text style={[styles.footer, { color: C.textMuted }]}>
          Ascen v{Constants.expoConfig?.version ?? '1.0.0'} · Feito com ❤️ no Brasil
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 24,
  },
});
