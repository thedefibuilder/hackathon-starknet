import React from 'react';

import chainLogo from '@/assets/images/chain-logo.png';

import ExternalAnchor from '../external-anchor';
import { Button } from '../ui/button';
import SectionContainer from './container';

interface IHeaderSection {
  chainsName: string;
  chainsDocumentationLink: string;
  className?: string;
}

export default function HeaderSection({
  chainsName,
  chainsDocumentationLink,
  className
}: IHeaderSection) {
  return (
    <SectionContainer className={className}>
      <div className='flex w-full flex-col justify-between md:flex-row'>
        <div className='flex flex-col gap-y-2.5'>
          <div className='flex items-center gap-x-2.5'>
            <img src={chainLogo} alt={`${chainsName}'s logo`} className='h-10' />
            <h1 className='text-2xl font-semibold md:text-3xl lg:text-4xl'>
              {chainsName} AI Builder
            </h1>
          </div>

          <h2 className='text-base font-medium text-muted-foreground md:text-lg'>
            Generate your custom DeFi application for {chainsName}
          </h2>
        </div>

        <Button size='lg' variant='secondary' className='mt-5 md:mt-0' asChild>
          <ExternalAnchor href={chainsDocumentationLink} className='text-base md:text-lg'>
            Explore Docs
          </ExternalAnchor>
        </Button>
      </div>
    </SectionContainer>
  );
}
