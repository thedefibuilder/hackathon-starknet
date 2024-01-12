import React from 'react';

import { Textarea } from '../ui/textarea';
import SectionContainer from './container';

interface ISmartContractCodeSection {
  chainsName: string;
  smartContractCode: string;
  smartContractFileExtension: string;
}

export default function CodeViewerSection({
  chainsName,
  smartContractCode,
  smartContractFileExtension
}: ISmartContractCodeSection) {
  return (
    <SectionContainer>
      <h3 className='text-xl font-semibold md:text-2xl lg:text-3xl'>Smart Contract Code</h3>
      <h4 className='text-base font-medium text-muted-foreground md:text-lg'>
        View the smart contract for your {chainsName} project
      </h4>

      <div className='relative'>
        <Textarea
          value={smartContractCode}
          className='mt-5 h-96 w-full resize-none rounded-3xl p-5 focus-visible:ring-0'
          readOnly
        />
      </div>
    </SectionContainer>
  );
}
