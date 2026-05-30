import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../hooks/useAppTheme';
import { useOnboarding } from '../context/OnboardingContext';

const { width: SW, height: SH } = Dimensions.get('window');

export type CoachStep = {
  title: string;
  body: string;
  emoji: string;
  /** Posição do spotlight. Se null, mostra centralizado (sem spotlight). */
  spotlight: null | {
    x: number;
    y: number;
    w: number;
    h: number;
    radius?: number;
  };
  /** Onde o tooltip aparece em relação ao spotlight */
  tooltipPosition?: 'above' | 'below' | 'center';
};

const STEPS: CoachStep[] = [
  {
    emoji: '👋',
    title: 'Bem-vindo ao Ascen!',
    body: 'Seu controle financeiro simples e seguro. Em menos de 2 minutos você vai conhecer tudo que precisa para começar.',
    spotlight: null,
    tooltipPosition: 'center',
  },
  {
    emoji: '🏠',
    title: 'Tela Início',
    body: 'Aqui você vê seu saldo do mês, entradas, saídas e os lançamentos recentes. Os botões "+ Saída" e "+ Entrada" são seus atalhos rápidos.',
    spotlight: null,
    tooltipPosition: 'center',
  },
  {
    emoji: '🔄',
    title: 'Recorrentes',
    body: 'Em Ajustes → Recorrentes você cadastra contas fixas como aluguel, salário ou assinaturas. O app projeta automaticamente os próximos meses sem você precisar lançar toda vez.',
    spotlight: null,
    tooltipPosition: 'center',
  },
  {
    emoji: '🎯',
    title: 'Metas',
    body: 'Na aba Metas você define objetivos com nome, valor alvo e prazo — uma viagem, reserva de emergência, o que quiser. Faça aportes e acompanhe o progresso.',
    spotlight: null,
    tooltipPosition: 'center',
  },
  {
    emoji: '👨‍👩‍👧',
    title: 'Família',
    body: 'Quer compartilhar lançamentos com alguém? Vá em Ajustes e copie seu código de família. A outra pessoa digita esse código no app dela e pronto — vocês ficam sincronizados.',
    spotlight: null,
    tooltipPosition: 'center',
  },
];

export function CoachMarksOverlay() {
  const { C } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { shouldShow, finishOnboarding } = useOnboarding();

  const [step, setStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  useEffect(() => {
    if (shouldShow) {
      setStep(0);
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
      ]).start();
    }
  }, [shouldShow]);

  const animateStep = (next: number) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -20, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setStep(next);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
      ]).start();
    });
  };

  const handleNext = () => {
    if (isLast) {
      finishOnboarding();
    } else {
      animateStep(step + 1);
    }
  };

  const handleSkip = () => {
    finishOnboarding();
  };

  if (!shouldShow) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      {/* Fundo escuro */}
      <View style={styles.overlay}>
        {/* Tooltip centralizado */}
        <View style={[styles.tooltipContainer, { paddingBottom: insets.bottom + 40 }]}>
          <Animated.View
            style={[
              styles.tooltip,
              {
                backgroundColor: C.card,
                borderColor: C.border,
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Indicador de passos */}
            <View style={styles.dotsRow}>
              {STEPS.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: i === step ? C.primary : C.border,
                      width: i === step ? 18 : 6,
                    },
                  ]}
                />
              ))}
            </View>

            {/* Emoji */}
            <View style={[styles.emojiCircle, { backgroundColor: C.primaryLight }]}>
              <Text style={{ fontSize: 36 }}>{current.emoji}</Text>
            </View>

            {/* Texto */}
            <Text style={[styles.title, { color: C.text }]}>{current.title}</Text>
            <Text style={[styles.body, { color: C.textMuted }]}>{current.body}</Text>

            {/* Botões */}
            <View style={styles.btnRow}>
              {!isLast && (
                <TouchableOpacity onPress={handleSkip} style={styles.skipBtn} activeOpacity={0.7}>
                  <Text style={{ color: C.textMuted, fontWeight: '600', fontSize: 15 }}>Pular</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleNext}
                activeOpacity={0.85}
                style={[styles.nextBtn, { backgroundColor: C.primary, flex: isLast ? 1 : undefined }]}
              >
                <Text style={styles.nextBtnText}>
                  {isLast ? 'Começar agora 🚀' : 'Próximo →'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Contador */}
            <Text style={[styles.counter, { color: C.textMuted }]}>
              {step + 1} de {STEPS.length}
            </Text>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'flex-end',
  },
  tooltipContainer: {
    paddingHorizontal: 20,
  },
  tooltip: {
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: 20,
    alignItems: 'center',
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  emojiCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 10,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    alignItems: 'center',
  },
  skipBtn: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  nextBtn: {
    flex: 1,
    borderRadius: 100,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  nextBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  counter: {
    marginTop: 14,
    fontSize: 12,
    fontWeight: '500',
  },
});
