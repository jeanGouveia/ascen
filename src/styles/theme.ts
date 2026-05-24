import { StyleSheet } from 'react-native';

/** Paleta clara (padrão). Telas de login podem importar `C_light` diretamente. */
export const C_light = {
  primary: '#4F6EF7',
  primaryLight: '#EEF1FE',
  primaryDark: '#3B56D9',

  success: '#16A34A',
  successLight: '#DCFCE7',

  danger: '#DC2626',
  dangerLight: '#FEE2E2',

  warning: '#D97706',
  warningLight: '#FEF3C7',

  bg: '#F5F7FF',
  card: '#FFFFFF',
  border: '#E4E9F8',
  divider: '#F0F3FC',

  text: '#1A2340',
  textMid: '#4A5578',
  textMuted: '#8896B8',
} as const;

export const C_dark = {
  primary: '#7B93FC',
  primaryLight: '#252B45',
  primaryDark: '#5C78E8',

  success: '#4ADE80',
  successLight: '#14532D',

  danger: '#F87171',
  dangerLight: '#450A0A',

  warning: '#FBBF24',
  warningLight: '#422006',

  bg: '#0C1018',
  card: '#151B28',
  border: '#2A3348',
  divider: '#1E2636',

  text: '#E8ECF5',
  textMid: '#A8B4D0',
  textMuted: '#6B7A99',
} as const;

export type AppColors = typeof C_light;

export const getColors = (dark: boolean): AppColors => (dark ? C_dark : C_light) as AppColors;

/** @deprecated Use `C_light` ou `useAppTheme().C` */
export const C = C_light;

export const R = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 28,
  full: 9999,
};

export function createThemedStyles(colors: AppColors, fontMult: number) {
  const f = (n: number) => Math.max(10, Math.round(n * fontMult));

  return StyleSheet.create({
    pageTitle: { fontSize: f(26), fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
    pageSubtitle: { fontSize: f(15), color: colors.textMuted, marginTop: 2 },
    sectionTitle: { fontSize: f(17), fontWeight: '700', color: colors.text },

    card: {
      backgroundColor: colors.card,
      borderRadius: R['2xl'],
      padding: 18,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 3,
    },

    balanceCard: { backgroundColor: colors.primary, borderRadius: R['2xl'], padding: 24, marginBottom: 16, overflow: 'hidden' },
    balanceGlow: { position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.10)' },
    balanceLabel: { color: 'rgba(255,255,255,0.80)', fontSize: f(14), fontWeight: '600', letterSpacing: 0.5, marginBottom: 6 },
    balanceValue: { color: '#fff', fontSize: f(38), fontWeight: '800', letterSpacing: -1, marginBottom: 20 },
    balanceRow: { flexDirection: 'row', alignItems: 'center' },
    balanceSub: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
    balanceDivider: { width: 1, height: 34, backgroundColor: 'rgba(255,255,255,0.25)', marginHorizontal: 16 },
    balanceSubLabel: { color: 'rgba(255,255,255,0.70)', fontSize: f(12), fontWeight: '500' },
    balanceSubValue: { color: '#fff', fontSize: f(16), fontWeight: '700' },
    dot: { width: 10, height: 10, borderRadius: 5 },

    alertBanner: {
      backgroundColor: colors.warningLight,
      borderRadius: R.xl,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    alertTitle: { fontWeight: '700', color: colors.warning, fontSize: f(15) },
    alertText: { color: colors.textMid, fontSize: f(13), marginTop: 2 },

    progressTrack: { width: '100%', backgroundColor: colors.border, borderRadius: R.full, overflow: 'hidden' },
    progressFill: { borderRadius: R.full },

    txCard: {
      backgroundColor: colors.card,
      borderRadius: R.xl,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    txIconWrap: { width: 46, height: 46, borderRadius: R.lg, alignItems: 'center', justifyContent: 'center' },
    txDescription: { fontSize: f(15), fontWeight: '700', color: colors.text, marginBottom: 2 },
    txMeta: { fontSize: f(13), color: colors.textMuted },
    txAmount: { fontSize: f(15), fontWeight: '800', letterSpacing: -0.3 },
    dateGroupLabel: { fontSize: f(12), fontWeight: '700', color: colors.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, marginTop: 4 },

    summaryPill: { borderRadius: R.xl, padding: 12, alignItems: 'center' },

    kpiCard: {
      borderRadius: R['2xl'],
      padding: 16,
      alignItems: 'center',
      gap: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    kpiAmount: { fontSize: f(20), fontWeight: '800', letterSpacing: -0.5 },
    kpiLabel: { fontSize: f(11), color: colors.textMuted, fontWeight: '700', letterSpacing: 0.8 },

    goalIconWrap: { width: 56, height: 56, borderRadius: R.xl, alignItems: 'center', justifyContent: 'center' },
    goalName: { fontSize: f(17), fontWeight: '700', color: colors.text },
    depositBtn: { borderRadius: R.xl, padding: 14, alignItems: 'center', marginTop: 12 },
    addGoalBtn: {
      borderRadius: R.xl,
      padding: 18,
      marginTop: 6,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      borderWidth: 2,
      borderColor: colors.primary,
      borderStyle: 'dashed',
      backgroundColor: colors.primaryLight,
    },

    profileCard: {
      backgroundColor: colors.card,
      borderRadius: R['2xl'],
      padding: 24,
      alignItems: 'center',
      marginBottom: 14,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 3,
    },
    profileAvatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
      overflow: 'hidden',
    },
    profileName: { fontSize: f(22), fontWeight: '800', color: colors.text },
    settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
    settingLabel: { fontSize: f(16), fontWeight: '600', color: colors.text },

    avatarCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.border,
    },
    quickBtn: { borderRadius: R.xl, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },

    emptyState: { alignItems: 'center', padding: 40 },
    emptyTitle: { fontSize: f(18), fontWeight: '700', color: colors.text, textAlign: 'center' },
    emptySubtitle: { fontSize: f(14), color: colors.textMuted, textAlign: 'center', marginTop: 6, lineHeight: f(20) },

    chip: { borderRadius: R.full, paddingHorizontal: 16, paddingVertical: 9, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
    chipText: { fontSize: f(14), fontWeight: '600', color: colors.textMid },

    fab: {
      position: 'absolute',
      right: 20,
      bottom: 20,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 8,
    },

    tabBar: { backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border, height: 64, paddingBottom: 12 },
    tabIconWrap: { width: 44, height: 34, borderRadius: R.md, alignItems: 'center', justifyContent: 'center' },
    tabLabel: { fontSize: f(11), fontWeight: '600' },

    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    modalTitle: { fontSize: f(18), fontWeight: '800', color: colors.text },
    modalSaveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: R.full },
    modalBtn: { borderRadius: R.xl, padding: 16, alignItems: 'center' },

    formGroup: { marginBottom: 18 },
    formLabel: { fontSize: f(11), fontWeight: '800', color: colors.textMuted, letterSpacing: 1.2, marginBottom: 8 },
    textInput: {
      backgroundColor: colors.bg,
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: R.xl,
      padding: 14,
      fontSize: f(16),
      color: colors.text,
      fontWeight: '500',
    },
    amountInput: {
      backgroundColor: colors.bg,
      borderWidth: 2,
      borderColor: colors.primary,
      borderRadius: R.xl,
      padding: 16,
      fontSize: f(28),
      color: colors.text,
      fontWeight: '800',
      letterSpacing: -0.5,
    },
    typeToggle: { flexDirection: 'row', backgroundColor: colors.bg, borderRadius: R.xl, padding: 4, marginBottom: 18, borderWidth: 1, borderColor: colors.border },
    typeBtn: { flex: 1, padding: 14, borderRadius: R.lg, alignItems: 'center' },
    typeBtnText: { fontSize: f(16), fontWeight: '700', color: colors.textMid },
    catChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: R.xl,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    catChipText: { fontSize: f(14), color: colors.textMid, fontWeight: '500' },

    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    bottomSheet: { backgroundColor: colors.card, borderTopLeftRadius: R['2xl'], borderTopRightRadius: R['2xl'], padding: 24, paddingBottom: 40 },

    iconBtn: {
      width: 52,
      height: 52,
      borderRadius: R.lg,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    colorDot: { width: 36, height: 36, borderRadius: 18 },
  });
}

export type ThemedStyles = ReturnType<typeof createThemedStyles>;

/** Estático claro (telas fora do ThemeProvider, ex.: login). */
export const s = createThemedStyles(C_light, 1);
