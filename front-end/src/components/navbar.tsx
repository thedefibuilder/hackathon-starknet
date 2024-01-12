import React, { Suspense } from 'react';

import defiBuilderLogo from '../assets/images/defi-builder-logo.png';
import { Skeleton } from './ui/skeleton';

const Wallet = React.lazy(() =>
  import('./wallet').then((component) => ({ default: component.Wallet }))
);

export default function Navbar() {
  return (
    <nav className='flex h-24 w-full justify-center border-b border-border px-2.5 xl:px-0'>
      <div className='flex h-full w-full max-w-[1320px] items-center justify-between'>
        <img src={defiBuilderLogo} alt="DeFi Builder's logo" className='h-6' />

        <Suspense fallback={<Skeleton className='h-10 w-40' />}>
          <Wallet className='w-40' />
        </Suspense>
      </div>
    </nav>
  );
}
