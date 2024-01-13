/* eslint-disable unicorn/prevent-abbreviations */

import React from 'react';

import { cn } from '@/lib/utils';

interface IExternalAnchor
  extends React.PropsWithChildren,
    React.AnchorHTMLAttributes<HTMLAnchorElement> {}

export default function ExternalAnchor({
  href,
  children,
  className,
  target = '_blank',
  rel = 'noopener noreferrer',
  ...properties
}: IExternalAnchor) {
  return (
    <a href={href} target={target} rel={rel} className={cn('', className)} {...properties}>
      {children}
    </a>
  );
}
