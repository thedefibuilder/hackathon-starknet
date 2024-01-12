import React, { useEffect, useState } from 'react';

import { Check, FileDown } from 'lucide-react';

import { cn } from '@/lib/utils';

import { Button } from './ui/button';

interface IDownloadButton {
  onClick: () => void;
  buttonClassName?: string;
  iconClassName?: string;
}

export default function DownloadButton({
  onClick: onDownloadButtonClick,
  buttonClassName,
  iconClassName
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
    setIsContentDownloaded(true);

    onDownloadButtonClick();

    const switchIconTimeout = setTimeout(() => {
      setIsContentDownloaded(false);
    }, 2000);

    setSwitchIconTimeout(switchIconTimeout);
  }

  return (
    <Button size='icon' variant='outline' className={cn(buttonClassName)} onClick={onClick}>
      {isContentDownloaded ? (
        <Check className={cn('h-5 w-5', iconClassName)} />
      ) : (
        <FileDown className={cn('h-5 w-5', iconClassName)} />
      )}
    </Button>
  );
}
