import React from 'react';

import type { HTMLAttributes, PropsWithChildren } from 'react';

import { cn } from '@/lib/utils';

interface IBorderedContainer extends PropsWithChildren, HTMLAttributes<HTMLDivElement> {}

export default function BorderedContainer({
  children,
  className,
  ...properties
}: IBorderedContainer) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-y-5 rounded-3xl border-2 border-border py-5 backdrop-blur-md md:gap-y-10 md:py-10',
        className
      )}
      {...properties}
    >
      {children}
    </div>
  );
}
