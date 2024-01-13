import React, { useEffect, useState } from 'react';

import type { PropsWithChildren } from 'react';
import type { ButtonProperties } from './ui/button';

import { Check, FileDown } from 'lucide-react';

import { cn } from '@/lib/utils';

import { Button } from './ui/button';

interface IDownloadButton extends PropsWithChildren, ButtonProperties {
  onButtonClick: () => void;
  iconClassName?: string;
}

export default function DownloadButton({
  children,
  onButtonClick,
  iconClassName,
  ...buttonProperties
}: IDownloadButton) {
  const [isContentDownloaded, setIsContentDownloaded] = useState(false);
  const [switchIconTimeout, setSwitchIconTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (switchIconTimeout) {
        clearTimeout(switchIconTimeout);
      }
    };
  }, [switchIconTimeout]);

  function onClick() {
    if (!children) {
      onButtonClick();

      return;
    }

    setIsContentDownloaded(true);
    onButtonClick();

    const switchIconTimeout = setTimeout(() => {
      setIsContentDownloaded(false);
    }, 2000);

    setSwitchIconTimeout(switchIconTimeout);
  }

  return (
    <Button onClick={onClick} {...buttonProperties}>
      {children ?? (
        <>
          {isContentDownloaded ? (
            <Check className={cn('h-5 w-5', iconClassName)} />
          ) : (
            <FileDown className={cn('h-5 w-5', iconClassName)} />
          )}
        </>
      )}
    </Button>
  );
}
