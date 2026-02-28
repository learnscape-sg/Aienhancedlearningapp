import { resolveEntryConfig, type EntryConfig, type EntryId } from '@/config/entryConfig';
import { getBrandConfig, type BrandConfig } from '@/config/brandConfig';

export interface RuntimeExperienceConfig {
  entry: EntryConfig;
  brand: BrandConfig;
}

export function resolveRuntimeExperienceConfig(input?: {
  hostname?: string;
  forcedEntryId?: EntryId | null;
}): RuntimeExperienceConfig {
  const entry = resolveEntryConfig({
    hostname: input?.hostname,
    forcedEntryId: input?.forcedEntryId,
  });
  return {
    entry,
    brand: getBrandConfig(entry.brandId),
  };
}
