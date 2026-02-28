import { useEffect } from 'react';
import type { ThemeTokens } from '@/config/brandConfig';
import { applyThemeTokens } from '@/lib/themeManager';

export function useTheme(tokens: ThemeTokens): void {
  useEffect(() => {
    applyThemeTokens(tokens);
  }, [tokens]);
}
