import React, { useState } from 'react';

import type { TPrompt } from '@/sdk/src/db-schemas/prompts';

import { Wand2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';

import { Button } from './ui/button';

interface IPredefinedPromptsModal {
  predefinedPrompts: TPrompt[];
  setPrompt: React.Dispatch<React.SetStateAction<string>>;
  triggerClassName?: string;
}

export default function PredefinedPromptsModal({
  predefinedPrompts,
  setPrompt,
  triggerClassName
}: IPredefinedPromptsModal) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger className={triggerClassName} asChild>
        <Button size='icon' variant='outline'>
          <Wand2 className='h-5 w-5' />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader className='flex gap-y-5'>
          <DialogTitle>Predefined Prompt</DialogTitle>

          <ul className='flex flex-col'>
            {predefinedPrompts.map((prompt) => (
              <li key={prompt.template} className='w-full'>
                <Button
                  variant='secondary'
                  className='flex h-min w-full flex-col items-start justify-start gap-y-2.5 px-2.5 py-2.5'
                  onClick={() => {
                    setPrompt(prompt.description);
                    setIsDialogOpen(false);
                  }}
                >
                  <span className='font-medium'>{prompt.title}</span>
                  <span className='text-muted-foreground'>{prompt.description}</span>
                </Button>
              </li>
            ))}
          </ul>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
