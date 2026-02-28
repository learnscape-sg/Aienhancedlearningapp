import type { ThemeTokens } from '@/config/brandConfig';

export function applyThemeTokens(tokens: ThemeTokens): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  Object.entries(tokens).forEach(([token, value]) => {
    root.style.setProperty(token, value);
  });
}
