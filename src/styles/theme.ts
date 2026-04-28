import { StyleSheet } from 'react-native';

export const C = {
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
};

export const R = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 28,
  full: 9999,
};

export const s = StyleSheet.create({
  pageTitle:    { fontSize: 26, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 15, color: C.textMuted, marginTop: 2 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: C.text },

  card: {
    backgroundColor: C.card,
    borderRadius: R['2xl'],
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },

  balanceCard:    { backgroundColor: C.primary, borderRadius: R['2xl'], padding: 24, marginBottom: 16, overflow: 'hidden' },
  balanceGlow:    { position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.10)' },
  balanceLabel:   { color: 'rgba(255,255,255,0.80)', fontSize: 14, fontWeight: '600', letterSpacing: 0.5, marginBottom: 6 },
  balanceValue:   { color: '#fff', fontSize: 38, fontWeight: '800', letterSpacing: -1, marginBottom: 20 },
  balanceRow:     { flexDirection: 'row', alignItems: 'center' },
  balanceSub:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  balanceDivider: { width: 1, height: 34, backgroundColor: 'rgba(255,255,255,0.25)', marginHorizontal: 16 },
  balanceSubLabel:{ color: 'rgba(255,255,255,0.70)', fontSize: 12, fontWeight: '500' },
  balanceSubValue:{ color: '#fff', fontSize: 16, fontWeight: '700' },
  dot:            { width: 10, height: 10, borderRadius: 5 },

  alertBanner: { backgroundColor: C.warningLight, borderRadius: R.xl, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, borderWidth: 1, borderColor: '#FDE68A' },
  alertTitle:  { fontWeight: '700', color: C.warning, fontSize: 15 },
  alertText:   { color: '#92400E', fontSize: 13, marginTop: 2 },

  progressTrack: { width: '100%', backgroundColor: C.border, borderRadius: R.full, overflow: 'hidden' },
  progressFill:  { borderRadius: R.full },

  txCard:     { backgroundColor: C.card, borderRadius: R.xl, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  txIconWrap: { width: 46, height: 46, borderRadius: R.lg, alignItems: 'center', justifyContent: 'center' },
  txDescription:  { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 2 },
  txMeta:         { fontSize: 13, color: C.textMuted },
  txAmount:       { fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
  dateGroupLabel: { fontSize: 12, fontWeight: '700', color: C.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, marginTop: 4 },

  summaryPill: { borderRadius: R.xl, padding: 12, alignItems: 'center' },

  kpiCard:   { borderRadius: R['2xl'], padding: 16, alignItems: 'center', gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  kpiAmount: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  kpiLabel:  { fontSize: 11, color: C.textMuted, fontWeight: '700', letterSpacing: 0.8 },

  goalIconWrap: { width: 56, height: 56, borderRadius: R.xl, alignItems: 'center', justifyContent: 'center' },
  goalName:   { fontSize: 17, fontWeight: '700', color: C.text },
  depositBtn: { borderRadius: R.xl, padding: 14, alignItems: 'center', marginTop: 12 },
  addGoalBtn: { borderRadius: R.xl, padding: 18, marginTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 2, borderColor: C.primary, borderStyle: 'dashed', backgroundColor: C.primaryLight },

  profileCard:   { backgroundColor: C.card, borderRadius: R['2xl'], padding: 24, alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  profileAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  profileName:   { fontSize: 22, fontWeight: '800', color: C.text },
  settingRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  settingLabel:  { fontSize: 16, fontWeight: '600', color: C.text },

  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.border },
  quickBtn:     { borderRadius: R.xl, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },

  emptyState:    { alignItems: 'center', padding: 40 },
  emptyTitle:    { fontSize: 18, fontWeight: '700', color: C.text, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: C.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 20 },

  chip:     { borderRadius: R.full, paddingHorizontal: 16, paddingVertical: 9, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card },
  chipText: { fontSize: 14, fontWeight: '600', color: C.textMid },

  fab: { position: 'absolute', right: 20, bottom: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', shadowColor: C.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.40, shadowRadius: 12, elevation: 8 },

  tabBar:      { backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border, height: 64, paddingBottom: 8 },
  tabIconWrap: { width: 44, height: 34, borderRadius: R.md, alignItems: 'center', justifyContent: 'center' },
  tabLabel:    { fontSize: 11, fontWeight: '600' },

  modalHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  modalTitle:    { fontSize: 18, fontWeight: '800', color: C.text },
  modalSaveBtn:  { paddingHorizontal: 16, paddingVertical: 8, borderRadius: R.full },
  modalBtn:      { borderRadius: R.xl, padding: 16, alignItems: 'center' },

  formGroup: { marginBottom: 18 },
  formLabel: { fontSize: 11, fontWeight: '800', color: C.textMuted, letterSpacing: 1.2, marginBottom: 8 },
  textInput: { backgroundColor: C.bg, borderWidth: 2, borderColor: C.border, borderRadius: R.xl, padding: 14, fontSize: 16, color: C.text, fontWeight: '500' },
  amountInput: { backgroundColor: C.bg, borderWidth: 2, borderColor: C.primary, borderRadius: R.xl, padding: 16, fontSize: 28, color: C.text, fontWeight: '800', letterSpacing: -0.5 },
  typeToggle: { flexDirection: 'row', backgroundColor: C.bg, borderRadius: R.xl, padding: 4, marginBottom: 18, borderWidth: 1, borderColor: C.border },
  typeBtn:    { flex: 1, padding: 14, borderRadius: R.lg, alignItems: 'center' },
  typeBtnText:{ fontSize: 16, fontWeight: '700', color: C.textMid },
  catChip:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: R.xl, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card },
  catChipText:{ fontSize: 14, color: C.textMid, fontWeight: '500' },

  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: C.card, borderTopLeftRadius: R['2xl'], borderTopRightRadius: R['2xl'], padding: 24, paddingBottom: 40 },

  iconBtn:  { width: 52, height: 52, borderRadius: R.lg, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.border, backgroundColor: C.card },
  colorDot: { width: 36, height: 36, borderRadius: 18 },
});
