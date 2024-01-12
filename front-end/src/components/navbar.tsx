import React, { Suspense } from 'react';

import { Skeleton } from './ui/skeleton';

const Wallet = React.lazy(() =>
  import('./wallet').then((component) => ({ default: component.Wallet }))
);

export default function Navbar() {
  return (
    <header className='flex h-16 w-full items-center justify-between border-b border-border px-5'>
      <span className='text-lg font-black'>Template</span>

      <Suspense fallback={<Skeleton className='h-10 w-40' />}>
        <Wallet className='w-40' />
      </Suspense>
    </header>
  );
}
