import React from 'react';

import type { PropsWithChildren } from 'react';

import { cn } from '@/lib/utils';

interface ISectionContainer extends PropsWithChildren, React.HTMLAttributes<HTMLDivElement> {}

export default function SectionContainer({
  className,
  children,
  ...properties
}: ISectionContainer) {
  return (
    <section className={cn('w-full px-5 md:px-10', className)} {...properties}>
      {children}
    </section>
  );
}
