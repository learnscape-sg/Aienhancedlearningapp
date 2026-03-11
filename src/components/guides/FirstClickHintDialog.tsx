import React from 'react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { FirstClickHintDefinition, GuideLanguage } from './guideCatalog';

interface FirstClickHintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
  hint: FirstClickHintDefinition;
  language: GuideLanguage;
}

export function FirstClickHintDialog({
  open,
  onOpenChange,
  onCancel,
  onConfirm,
  hint,
  language,
}: FirstClickHintDialogProps) {
  const { t } = useTranslation('common');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{hint.title[language]}</DialogTitle>
          <DialogDescription>{hint.description[language]}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {t('guide.cancel')}
          </Button>
          <Button onClick={onConfirm}>
            {t('guide.confirmContinue')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
