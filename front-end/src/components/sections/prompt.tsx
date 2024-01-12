import React from 'react';

import { Textarea } from '../ui/textarea';
import SectionContainer from './container';

interface IPromptSection {
  chainsName: string;
  prompt: string;
  setPrompt: React.Dispatch<React.SetStateAction<string>>;
}

export default function PromptSection({ chainsName, prompt, setPrompt }: IPromptSection) {
  return (
    <SectionContainer>
      <h3 className='text-xl font-semibold md:text-2xl lg:text-3xl'>Describe Customisation</h3>
      <h4 className='text-base font-medium text-muted-foreground md:text-lg'>
        Choose customisation to add into your {chainsName} project
      </h4>

      <div className='relative'>
        <Textarea
          value={prompt}
          placeholder='Insert token name, supply and others customisations'
          className='mt-5 h-60 w-full resize-none rounded-3xl p-5'
          onChange={(event) => setPrompt(event.target.value)}
        />
      </div>
    </SectionContainer>
  );
}
