import React, { useEffect, useState } from 'react';

import { Check, Copy } from 'lucide-react';

import { cn } from '@/lib/utils';

import { Button } from './ui/button';

interface ICopyButton {
  onClick: () => void;
  buttonClassName?: string;
  iconClassName?: string;
}

export default function CopyButton({
  onClick: onCopyButtonClick,
  buttonClassName,
  iconClassName
}: ICopyButton) {
  const [isContentCopied, setIsContentCopied] = useState(false);
  const [switchIconTimeout, setSwitchIconTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (switchIconTimeout) {
        clearTimeout(switchIconTimeout);
      }
    };
  }, [switchIconTimeout]);

  function onClick() {
    setIsContentCopied(true);

    onCopyButtonClick();

    const switchIconTimeout = setTimeout(() => {
      setIsContentCopied(false);
    }, 2000);

    setSwitchIconTimeout(switchIconTimeout);
  }

  return (
    <Button size='icon' variant='outline' className={cn(buttonClassName)} onClick={onClick}>
      {isContentCopied ? (
        <Check className={cn('h-5 w-5', iconClassName)} />
      ) : (
        <Copy className={cn('h-5 w-5', iconClassName)} />
      )}
    </Button>
  );
}
