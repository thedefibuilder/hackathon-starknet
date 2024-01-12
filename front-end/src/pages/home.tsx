import React, { Suspense, useState } from 'react';

import type IPredefinedPrompt from '@/interfaces/predefined-prompt';
import type ITemplate from '@/interfaces/template';

import { Skeleton } from '@/components/ui/skeleton';

const HeaderSection = React.lazy(() => import('@/components/sections/header'));
const TemplatesSection = React.lazy(() => import('@/components/sections/templates'));
const PromptSection = React.lazy(() => import('@/components/sections/prompt'));
const CodeViewerSection = React.lazy(() => import('@/components/sections/code-viewer'));

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

const predefinedPrompts: IPredefinedPrompt[] = [
  {
    id: '65827f546828e956077b7545',
    title: 'ERC20 Token',
    description: 'Token name must be X , with ticket Y and a total supply of 100000.'
  }
];

const smartContractCode = `// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract XToken is ERC20, Ownable {

    constructor() ERC20("X", "Y") {
        _mint(msg.sender, 100000 * (10 ** uint256(decimals())));
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }
}`;

const smartContractFileExtension = '.cairo';

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
          className='rounded-3xl border-2 border-border bg-cover py-5 backdrop-blur-md md:mt-16 md:bg-contain md:py-10'
        />
      </Suspense>

      <div className='flex flex-col gap-y-5 rounded-3xl border-2 border-border py-5 backdrop-blur-md md:gap-y-10 md:py-10'>
        <Suspense fallback={<Skeleton className='h-60 w-full' />}>
          <TemplatesSection
            chainsName={chainsName}
            templates={templates}
            activeTemplateName={activeTemplateName}
            setActiveTemplateName={setActiveTemplateName}
          />
        </Suspense>

        <Suspense fallback={<Skeleton className='h-60 w-full' />}>
          <PromptSection
            chainsName={chainsName}
            predefinedPrompts={predefinedPrompts}
            prompt={prompt}
            setPrompt={setPrompt}
          />
        </Suspense>

        <Suspense fallback={<Skeleton className='h-60 w-full' />}>
          <CodeViewerSection
            chainsName={chainsName}
            smartContractCode={smartContractCode}
            smartContractFileExtension={smartContractFileExtension}
          />
        </Suspense>
      </div>
    </div>
  );
}
