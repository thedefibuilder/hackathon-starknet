import React from 'react';

import { Check, Loader2, X } from 'lucide-react';

import { cn } from '@/lib/utils';

interface IStep {
  number: number;
  step: string;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  isStepConnected: boolean;
}

interface IContractCreationSteps {
  steps: IStep[];
}

export default function ContractCreationSteps({ steps }: IContractCreationSteps) {
  return (
    <ul className='flex gap-x-5'>
      {steps.map((step) => (
        <li key={step.number} className='flex flex-col items-center justify-center gap-y-1.5'>
          <div
            className={cn(
              'relative flex h-7 w-7 items-center justify-center rounded-full bg-secondary p-1',
              {
                'bg-primary text-primary-foreground': step.isSuccess,
                'bg-destructive text-destructive-foreground': step.isError
              }
            )}
          >
            {step.isLoading ? (
              <Loader2 className='h-7 w-7 animate-spin ' />
            ) : step.isSuccess ? (
              <Check className='h-5 w-5' />
            ) : step.isError ? (
              <X className='h-5 w-5' />
            ) : (
              <span>{step.number}</span>
            )}

            {step.isStepConnected && (
              <span
                className={cn('absolute left-[7px] -z-[1] h-1 w-24 bg-secondary', {
                  'bg-primary text-primary-foreground': step.isSuccess,
                  'bg-destructive text-destructive-foreground': step.isError
                })}
              />
            )}
          </div>
          <span className='text-xs font-medium text-muted-foreground md:text-base'>
            {step.step}
          </span>
        </li>
      ))}
    </ul>
  );
}
