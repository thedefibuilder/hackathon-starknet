import React, { useState } from 'react';

import { Loader2 } from 'lucide-react';

import IArtifact from '@/interfaces/artifact';
import downloadContent from '@/lib/download';

import DownloadButton from './download-button';

export default function DownloadArtifactsButton({ casm, sierra }: IArtifact) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <DownloadButton
      className='w-40'
      onButtonClick={async () => {
        setIsLoading(true);

        const casmBlob = JSON.stringify(casm);
        downloadContent(casmBlob, 'casm.json');
        const sierraBlob = JSON.stringify(sierra);
        downloadContent(sierraBlob, 'sierra.json');

        setIsLoading(false);
      }}
    >
      {isLoading ? (
        <div className='flex items-center gap-x-2.5'>
          <Loader2 className='animate-spin' />
          <span>Downloading Artifacts</span>
        </div>
      ) : (
        <span>Download Artifacts</span>
      )}
    </DownloadButton>
  );
}

