import React, { useState } from 'react';

import type { TVulnerability } from '@/sdk/src/types';

import { pdf } from '@react-pdf/renderer';
import { Loader2 } from 'lucide-react';

import downloadContent from '@/lib/download';

import AuditPdf from './audit-pdf';
import DownloadButton from './download-button';

interface IDownloadAuditButton {
  audit: TVulnerability[];
}

export default function DownloadAuditButton({ audit }: IDownloadAuditButton) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  return (
    <DownloadButton
      className='mt-5 w-full md:mt-0 md:w-40'
      onButtonClick={async () => {
        setIsGeneratingPdf(true);

        const blobPdf = await pdf(<AuditPdf audit={audit} />).toBlob();
        downloadContent(blobPdf, 'DeFi Builder - Smart contract audit.pdf');

        setIsGeneratingPdf(false);
      }}
    >
      {isGeneratingPdf ? (
        <div className='flex items-center gap-x-2.5'>
          <Loader2 className='animate-spin' />
          <span>Generating PDF</span>
        </div>
      ) : (
        <span>Download Audit</span>
      )}
    </DownloadButton>
  );
}
