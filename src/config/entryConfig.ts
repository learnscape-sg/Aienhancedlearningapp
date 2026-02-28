export type EntryId = 'cn' | 'sg' | 'default';
export type LanguageSpace = 'zh' | 'en';

export interface EntryConfig {
  id: EntryId;
  marketCode: 'CN' | 'SG' | 'GLOBAL';
  defaultLanguageSpace: LanguageSpace;
  defaultLocale: string;
  brandId: string;
  appBasePath: string;
}

const ENTRY_BY_ID: Record<EntryId, EntryConfig> = {
  cn: {
    id: 'cn',
    marketCode: 'CN',
    defaultLanguageSpace: 'zh',
    defaultLocale: 'zh',
    brandId: 'cn-default',
    appBasePath: '/app',
  },
  sg: {
    id: 'sg',
    marketCode: 'SG',
    defaultLanguageSpace: 'en',
    defaultLocale: 'en',
    brandId: 'sg-default',
    appBasePath: '/app',
  },
  default: {
    id: 'default',
    marketCode: 'GLOBAL',
    defaultLanguageSpace: 'zh',
    defaultLocale: 'zh',
    brandId: 'cn-default',
    appBasePath: '/app',
  },
};

export function detectEntryId(hostname: string): EntryId {
  const normalized = hostname.toLowerCase();
  if (normalized.startsWith('cn.') || normalized.includes('.cn.')) return 'cn';
  if (normalized.startsWith('sg.') || normalized.includes('.sg.')) return 'sg';
  return 'default';
}

export function resolveEntryConfig(input?: { hostname?: string; forcedEntryId?: EntryId | null }): EntryConfig {
  if (input?.forcedEntryId && ENTRY_BY_ID[input.forcedEntryId]) {
    return ENTRY_BY_ID[input.forcedEntryId];
  }
  const hostname = input?.hostname ?? (typeof window !== 'undefined' ? window.location.hostname : '');
  const id = detectEntryId(hostname || '');
  return ENTRY_BY_ID[id];
}
