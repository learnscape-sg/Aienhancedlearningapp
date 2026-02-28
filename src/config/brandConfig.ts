export type ThemeTokens = Record<string, string>;

export interface BrandLabels {
  appName: string;
  appTagline: string;
  teacherWorkspaceName: string;
  studentWorkspaceName: string;
  parentWorkspaceName: string;
}

export interface BrandConfig {
  id: string;
  labels: BrandLabels;
  themeTokens: ThemeTokens;
}

const sharedTokens: ThemeTokens = {
  '--font-size': '16px',
  '--radius': '0.625rem',
  '--google-blue': '#4285F4',
  '--google-red': '#EA4335',
  '--google-yellow': '#FBBC05',
  '--google-green': '#34A853',
};

const BRAND_MAP: Record<string, BrandConfig> = {
  'cn-default': {
    id: 'cn-default',
    labels: {
      appName: 'AI随心学',
      appTagline: 'AI智能自学平台',
      teacherWorkspaceName: '教师平台',
      studentWorkspaceName: '学生学习空间',
      parentWorkspaceName: '家长仪表盘',
    },
    themeTokens: {
      ...sharedTokens,
      '--primary': '#4F46E5',
      '--primary-hover': '#4338CA',
      '--primary-foreground': '#FFFFFF',
      '--secondary': '#22D3EE',
      '--accent': '#FBBF24',
      '--danger': '#DC2626',
    },
  },
  'sg-default': {
    id: 'sg-default',
    labels: {
      appName: 'LearnYourWay AI',
      appTagline: 'AI-powered learning platform',
      teacherWorkspaceName: 'Teacher Workspace',
      studentWorkspaceName: 'Student Learning Space',
      parentWorkspaceName: 'Parent Dashboard',
    },
    themeTokens: {
      ...sharedTokens,
      '--primary': '#0EA5E9',
      '--primary-hover': '#0284C7',
      '--primary-foreground': '#FFFFFF',
      '--secondary': '#10B981',
      '--accent': '#F59E0B',
      '--danger': '#DC2626',
    },
  },
};

export function getBrandConfig(brandId: string): BrandConfig {
  return BRAND_MAP[brandId] ?? BRAND_MAP['cn-default'];
}
