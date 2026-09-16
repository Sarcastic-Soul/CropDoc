import { useColorScheme as useRNColorScheme } from 'react-native';

import { useThemePreference } from '@/contexts/theme-preference';

export function useColorScheme() {
  const systemScheme = useRNColorScheme();
  const { preference } = useThemePreference();
  return preference === 'system' ? systemScheme : preference;
}
