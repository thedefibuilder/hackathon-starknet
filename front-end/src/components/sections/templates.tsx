import React from 'react';

import type ITemplate from '@/interfaces/template';

import { cn } from '@/lib/utils';

import { Button } from '../ui/button';
import SectionContainer from './container';

interface ITemplatesSection {
  chainsName: string;
  templates: ITemplate[];
  activeTemplateName: string;
  setActiveTemplateName: React.Dispatch<React.SetStateAction<string>>;
}

export default function TemplatesSection({
  chainsName,
  templates,
  activeTemplateName,
  setActiveTemplateName
}: ITemplatesSection) {
  return (
    <SectionContainer>
      <h3 className='text-xl font-semibold md:text-2xl lg:text-3xl'>Select template</h3>
      <h4 className='text-base font-medium text-muted-foreground md:text-lg'>
        Choose modules to activate on your project
      </h4>

      <ul className='mt-5 flex w-full flex-col gap-5 lg:flex-row'>
        {templates.map((template) => (
          <li key={template.name} className='w-full lg:aspect-square lg:w-1/6'>
            <Button
              variant='outline'
              title={template.isActive ? '' : 'Coming soon...'}
              className={cn(
                'flex h-max w-full flex-col items-center gap-y-2.5 whitespace-normal rounded-3xl border-2 p-2.5 text-center lg:h-full lg:p-1',
                {
                  'border-primary hover:bg-background': activeTemplateName === template.name
                }
              )}
              disabled={!template.isActive}
              onClick={() => {
                if (template.isActive) {
                  setActiveTemplateName(template.name);
                }
              }}
            >
              <img src={template.iconURL} />
              <span className='text-lg font-medium'>{template.name}</span>
              <span className='text-sm text-muted-foreground'>
                Generate a {chainsName} custom {template.name}
              </span>
            </Button>
          </li>
        ))}
      </ul>
    </SectionContainer>
  );
}

