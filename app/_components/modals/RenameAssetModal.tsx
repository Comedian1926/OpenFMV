'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Edit3, Loader2 } from 'lucide-react';

import { Button } from '@/app/_components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/_components/ui/dialog';
import { Input } from '@/app/_components/ui/input';
import { Label } from '@/app/_components/ui/label';

interface RenameAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newName: string) => Promise<void>;
  currentName: string;
}

export function RenameAssetModal({
  isOpen,
  onClose,
  onConfirm,
  currentName,
}: RenameAssetModalProps) {
  const t = useTranslations('assets.modal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState(currentName);

  React.useEffect(() => {
    setName(currentName);
  }, [currentName, isOpen]);

  const handleConfirm = async () => {
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onConfirm(name);
      onClose();
    } catch (error) {
      console.error('Failed to rename asset', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') void handleConfirm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-white/15 bg-openfmv-node text-openfmv-text">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-openfmv-accent" />
            {t('renameTitle')}
          </DialogTitle>
          <DialogDescription>{t('renameDescription')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="asset-name" className="text-openfmv-sub">
            {t('assetName')}
          </Label>
          <Input
            id="asset-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('namePlaceholder')}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            {t('cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting || !name.trim()}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isSubmitting ? t('saving') : t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
