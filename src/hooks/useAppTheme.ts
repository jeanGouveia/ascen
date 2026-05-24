import { useMemo } from 'react';
import { usePreferences, FontScale } from '../context/PreferencesContext';
import { createThemedStyles, getColors, R, AppColors } from '../styles/theme';
import type { ThemedStyles } from '../styles/theme';

function fontMultiplier(scale: FontScale): number {
  if (scale === 'small') return 0.92;
  if (scale === 'large') return 1.1;
  if (scale === 'xlarge') return 1.22;
  return 1;
}

export function useAppTheme(): { C: AppColors; s: ThemedStyles; R: typeof R; fontScale: FontScale } {
  const { darkMode, fontScale } = usePreferences();
  const C = useMemo(() => getColors(darkMode), [darkMode]);
  const mult = fontMultiplier(fontScale);
  const s = useMemo(() => createThemedStyles(C, mult), [C, mult]);
  return { C, s, R, fontScale };
}
