import React from 'react';

import { copyToClipboard, isClipboardApiSupported } from '@/lib/clipboard';
import downloadContent from '@/lib/download';

import CopyButton from '../copy-button';
import DownloadButton from '../download-button';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import SectionContainer from './container';

interface ISmartContractCodeSection {
  chainsName: string;
  smartContractCode: string;
  smartContractFileExtension: string;
  contractArtifacts: string | null;
  onDeployContractClick: () => void;
}

export default function CodeViewerSection({
  chainsName,
  smartContractCode,
  smartContractFileExtension,
  contractArtifacts,
  onDeployContractClick
}: ISmartContractCodeSection) {
  return (
    <SectionContainer>
      <div className='flex flex-col items-start justify-between md:flex-row'>
        <div className='flex flex-col'>
          <h3 className='text-xl font-semibold md:text-2xl lg:text-3xl'>Smart Contract Code</h3>
          <h4 className='text-base font-medium text-muted-foreground md:text-lg'>
            View the smart contract for your {chainsName} project
          </h4>
        </div>

        {contractArtifacts && (
          <Button className='mt-5 w-full md:mt-0 md:w-auto' onClick={onDeployContractClick}>
            Deploy Smart Contract
          </Button>
        )}
      </div>

      <div className='relative'>
        <Textarea
          value={smartContractCode}
          className='mt-5 h-96 w-full resize-none rounded-3xl p-5 focus-visible:ring-0'
          readOnly
        />

        {isClipboardApiSupported && (
          <CopyButton
            onClick={async () => copyToClipboard(smartContractCode)}
            buttonClassName='absolute right-20 top-5'
          />
        )}

        <DownloadButton
          size='icon'
          variant='outline'
          className='absolute right-5 top-5'
          onButtonClick={() =>
            downloadContent(
              smartContractCode,
              `smart-contract.${smartContractFileExtension}`,
              'text/plain'
            )
          }
        />
      </div>
    </SectionContainer>
  );
}
