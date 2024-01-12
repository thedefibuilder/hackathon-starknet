import React, { Suspense } from 'react';

import { Skeleton } from '@/components/ui/skeleton';

const HeaderSection = React.lazy(() => import('@/components/sections/header'));

const chainsName = 'Starknet';
const chainsDocumentationLink = 'https://docs.defibuilder.com/';

export default function HomePage() {
  return (
    <div className='flex w-full max-w-[1140px] flex-col gap-y-5'>
      <Suspense fallback={<Skeleton className='h-40 w-full md:mt-16' />}>
        <HeaderSection
          chainsName={chainsName}
          chainsDocumentationLink={chainsDocumentationLink}
          className='rounded-3xl border-2 border-border bg-cover py-5 md:mt-16 md:bg-contain md:py-10'
        />
      </Suspense>
    </div>
  );
}
