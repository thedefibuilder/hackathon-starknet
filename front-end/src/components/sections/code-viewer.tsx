/* eslint-disable sonarjs/no-duplicate-string */

import React from 'react';

import type IArtifact from '@/interfaces/artifact';

import { copyToClipboard, isClipboardApiSupported } from '@/lib/clipboard';
import downloadContent from '@/lib/download';

import CopyButton from '../copy-button';
import DownloadButton from '../download-button';
import { Textarea } from '../ui/textarea';
import SectionContainer from './container';

interface ISmartContractCodeSection {
  chainsName: string;
  smartContractCode: string;
  smartContractFileExtension: string;
  contractArtifacts: IArtifact | null;
}

export default function CodeViewerSection({
  chainsName,
  smartContractCode,
  smartContractFileExtension,
  contractArtifacts
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
          <div className='mt-5 flex w-full flex-col gap-5 md:mt-0 md:w-auto md:flex-row'>
            <DownloadButton
              className='w-full md:w-auto'
              onButtonClick={async () => {
                downloadContent(
                  JSON.stringify(contractArtifacts.sierra),
                  'sierra-artifact.json',
                  'text/plain'
                );
              }}
            >
              <span>Download Sierra Artifact</span>
            </DownloadButton>

            <DownloadButton
              className='w-full md:w-auto'
              onButtonClick={async () => {
                downloadContent(
                  JSON.stringify(contractArtifacts.casm),
                  'casm-artifact.json',
                  'text/plain'
                );
              }}
            >
              <span>Download Casm Artifact</span>
            </DownloadButton>
          </div>
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
              `smart-contract${smartContractFileExtension}`,
              'text/plain'
            )
          }
        />
      </div>
    </SectionContainer>
  );
}
