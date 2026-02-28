import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import type { LanguageSpace } from '@/config/entryConfig';

interface ParentDashboardProps {
  activeSection: string;
  languageSpace: LanguageSpace;
}

export function ParentDashboard({ activeSection, languageSpace }: ParentDashboardProps) {
  const isZh = languageSpace === 'zh';

  if (activeSection === 'settings') {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>{isZh ? '家长设置' : 'Parent Settings'}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            {isZh
              ? '可在此配置通知偏好、孩子可见范围以及语言空间默认过滤。'
              : 'Configure notifications, child visibility, and default language-space filters here.'}
          </CardContent>
        </Card>
      </div>
    );
  }

  const sectionTitle =
    activeSection === 'progress'
      ? isZh
        ? '学习进度'
        : 'Learning Progress'
      : activeSection === 'rewards'
        ? isZh
          ? '积分奖励'
          : 'Rewards'
        : isZh
          ? '孩子概览'
          : 'Child Overview';

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{sectionTitle}</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          {isZh
            ? '该模块已接入语言空间过滤（中文/英文）。后续可继续对接孩子档案、分语言进度与奖励分账。'
            : 'This module is language-space aware (Chinese/English). Next steps can connect child profiles, progress-by-language, and reward ledgers.'}
        </CardContent>
      </Card>
    </div>
  );
}
