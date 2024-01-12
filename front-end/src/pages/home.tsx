import React, { Suspense, useState } from 'react';

import type IPredefinedPrompt from '@/interfaces/predefined-prompt';
import type ITemplate from '@/interfaces/template';

import { Skeleton } from '@/components/ui/skeleton';

const HeaderSection = React.lazy(() => import('@/components/sections/header'));
const TemplatesSection = React.lazy(() => import('@/components/sections/templates'));
const PromptSection = React.lazy(() => import('@/components/sections/prompt'));

const chainsName = 'Starknet';
const chainsDocumentationLink = 'https://docs.defibuilder.com/';

const templates: ITemplate[] = [
  {
    name: 'Token',
    isActive: true
  },
  {
    name: 'NFT',
    isActive: true
  },
  {
    name: 'Staking',
    isActive: false
  },
  {
    name: 'Farm',
    isActive: false
  },
  {
    name: 'Marketplace',
    isActive: false
  },
  {
    name: 'Launchpad',
    isActive: false
  }
];

export default function HomePage() {
  // eslint-disable-next-line unicorn/prefer-array-find
  const activeTemplates = templates.filter((template) => template.isActive);

  const [activeTemplateName, setActiveTemplateName] = useState(activeTemplates[0].name);
  const [prompt, setPrompt] = useState('');

  return (
    <div className='flex w-full max-w-[1140px] flex-col gap-y-5'>
      <Suspense fallback={<Skeleton className='h-40 w-full md:mt-16' />}>
        <HeaderSection
          chainsName={chainsName}
          chainsDocumentationLink={chainsDocumentationLink}
          className='rounded-3xl border-2 border-border bg-cover py-5 md:mt-16 md:bg-contain md:py-10'
        />
      </Suspense>

      <div className='flex flex-col gap-y-5 rounded-3xl border-2 border-border py-5 md:gap-y-10 md:py-10'>
        <Suspense fallback={<Skeleton className='h-60 w-full' />}>
          <TemplatesSection
            chainsName={chainsName}
            templates={templates}
            activeTemplateName={activeTemplateName}
            setActiveTemplateName={setActiveTemplateName}
          />
        </Suspense>

        <Suspense fallback={<Skeleton className='h-60 w-full' />}>
          <PromptSection chainsName={chainsName} prompt={prompt} setPrompt={setPrompt} />
        </Suspense>
      </div>
    </div>
  );
}
