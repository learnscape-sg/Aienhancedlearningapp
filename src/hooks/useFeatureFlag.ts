import { useMemo } from 'react';
import { isFeatureEnabled } from '@/lib/featureFlags';

export function useFeatureFlag(
  key: Parameters<typeof isFeatureEnabled>[0],
  overrides?: Parameters<typeof isFeatureEnabled>[1]
): boolean {
  return useMemo(() => isFeatureEnabled(key, overrides), [key, overrides]);
}
