import React, { Suspense, useEffect, useReducer, useState } from 'react';

import type IArtifact from '@/interfaces/artifact';
import type { TContractType } from '@/sdk/src/types';

import { Loader2 } from 'lucide-react';

import stepBackground from '@/assets/images/step.svg';
import BorderedContainer from '@/components/bordered-container';
import ContractCreationSteps from '@/components/contract-creation-steps';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import chainConfig from '@/config/chain';
import EReducerState from '@/constants/reducer-state';
import { auditContractInitialState, auditContractReducer } from '@/reducers/audit-contract';
import { compileContractInitialState, compileContractReducer } from '@/reducers/compile-contract';
import {
  generateContractInitialState,
  generateContractReducer
} from '@/reducers/generate-contract';
import {
  predefinedPromptsInitialState,
  predefinedPromptsReducer
} from '@/reducers/predefined-prompts';
import { LlmService } from '@/sdk/llmService.sdk';

const HeaderSection = React.lazy(() => import('@/components/sections/header'));
const TemplatesSection = React.lazy(() => import('@/components/sections/templates'));
const PromptSection = React.lazy(() => import('@/components/sections/prompt'));
const AuditSection = React.lazy(() => import('@/components/sections/audit'));
const CodeViewerSection = React.lazy(() => import('@/components/sections/code-viewer'));

export default function HomePage() {
  // eslint-disable-next-line unicorn/prefer-array-find
  const activeTemplates = chainConfig.templates.filter((template) => template.isActive);

  const [activeTemplateName, setActiveTemplateName] = useState(activeTemplates[0].name);
  const [userPrompt, setUserPrompt] = useState('');

  const [predefinedPromptsState, dispatchPredefinedPrompts] = useReducer(
    predefinedPromptsReducer,
    predefinedPromptsInitialState
  );

  const [generateContractState, dispatchGenerateContract] = useReducer(
    generateContractReducer,
    generateContractInitialState
  );

  const [compileContractState, dispatchCompileContract] = useReducer(
    compileContractReducer,
    compileContractInitialState
  );

  const [auditContractState, dispatchAuditContract] = useReducer(
    auditContractReducer,
    auditContractInitialState
  );

  useEffect(() => {
    async function getPredefinedPromptsByTemplate() {
      try {
        dispatchPredefinedPrompts({
          state: EReducerState.reset,
          payload: null
        });

        const promptsResponse = await LlmService.getPromptByTemplate(
          activeTemplateName as TContractType
        );

        if (!promptsResponse || !Array.isArray(promptsResponse)) {
          dispatchPredefinedPrompts({
            state: EReducerState.error,
            payload: null
          });

          return;
        }

        setUserPrompt('');
        dispatchPredefinedPrompts({
          state: EReducerState.success,
          payload: promptsResponse
        });

        console.log('promptsResponse', promptsResponse);
      } catch (error) {
        dispatchPredefinedPrompts({
          state: EReducerState.error,
          payload: null
        });

        console.error('ERROR FETCHING PROMPTS BY TEMPLATE', error);
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    getPredefinedPromptsByTemplate();
  }, [activeTemplateName]);

  const isGenerationLoading =
    generateContractState.isLoading ||
    compileContractState.isLoading ||
    auditContractState.isLoading;

  const isGenerationCompleted =
    (generateContractState.isError || generateContractState.isSuccess) &&
    (auditContractState.isError || auditContractState.isSuccess);

  const creationSteps = [
    {
      number: 1,
      step: 'Generating',
      isLoading: generateContractState.isLoading,
      isSuccess: generateContractState.isSuccess,
      isError: generateContractState.isError,
      isStepConnected: true
    },
    {
      number: 2,
      step: 'Compiling',
      isLoading: compileContractState.isLoading,
      isSuccess: compileContractState.isSuccess,
      isError: compileContractState.isError,
      isStepConnected: true
    },
    {
      number: 3,
      step: 'Auditing',
      isLoading: auditContractState.isLoading,
      isSuccess: auditContractState.isSuccess,
      isError: auditContractState.isError,
      isStepConnected: true
    },
    {
      number: 4,
      step: 'Completed',
      isLoading: false,
      isSuccess: isGenerationCompleted,
      isError:
        generateContractState.isError && compileContractState.isError && auditContractState.isError,
      isStepConnected: false
    }
  ];

  async function initCreation() {
    dispatchGenerateContract({
      state: EReducerState.reset,
      payload: null
    });

    dispatchCompileContract({
      state: EReducerState.reset,
      payload: null
    });

    dispatchAuditContract({
      state: EReducerState.reset,
      payload: null
    });

    const contractCode = await generateContract();

    if (contractCode) {
      await compileContract(contractCode);
      await auditContract(contractCode);
    }
  }

  async function generateContract() {
    console.log('GENERATING CONTRACT');

    try {
      dispatchGenerateContract({
        state: EReducerState.start,
        payload: null
      });

      const contractCodeResponse = await LlmService.callCairoGeneratorLLM(
        userPrompt,
        activeTemplateName as TContractType
      );

      if (
        contractCodeResponse === null ||
        contractCodeResponse === undefined ||
        typeof contractCodeResponse !== 'string'
      ) {
        dispatchGenerateContract({
          state: EReducerState.error,
          payload: null
        });

        console.error('ERROR GENERATING CONTRACT', contractCodeResponse);

        return null;
      }

      dispatchGenerateContract({
        state: EReducerState.success,
        payload: contractCodeResponse
      });

      console.log('CONTRACT CODE', contractCodeResponse);

      return contractCodeResponse;
    } catch (error) {
      dispatchGenerateContract({
        state: EReducerState.error,
        payload: null
      });

      console.error('ERROR GENERATING CONTRACT', error);
    }

    return null;
  }

  async function compileContract(contractCode: string) {
    console.log('COMPILING CONTRACT');

    try {
      dispatchCompileContract({
        state: EReducerState.start,
        payload: null
      });

      const compileContractResponse = await LlmService.buildCairoCode(contractCode);

      if (
        compileContractResponse === null ||
        compileContractResponse === undefined ||
        !compileContractResponse.success
      ) {
        dispatchCompileContract({
          state: EReducerState.error,
          payload: null
        });

        console.error('ERROR COMPILING CONTRACT', compileContractResponse);

        return;
      }

      dispatchCompileContract({
        state: EReducerState.success,
        payload: compileContractResponse.artifact as IArtifact
      });

      console.log('COMPILATION RESPONSE', compileContractResponse);
    } catch (error) {
      dispatchCompileContract({
        state: EReducerState.error,
        payload: null
      });

      console.error('ERROR COMPILING CONTRACT', error);
    }
  }

  async function auditContract(contractCode: string) {
    console.log('AUDITING CONTRACT');

    try {
      dispatchAuditContract({
        state: EReducerState.start,
        payload: null
      });

      const auditContractResponse = await LlmService.callAuditorLLM(contractCode);

      if (
        auditContractResponse === null ||
        auditContractResponse === undefined ||
        !Array.isArray(auditContractResponse)
      ) {
        dispatchAuditContract({
          state: EReducerState.error,
          payload: null
        });

        console.error('ERROR AUDITING CONTRACT', auditContractResponse);

        return;
      }

      dispatchAuditContract({
        state: EReducerState.success,
        payload: auditContractResponse
      });

      console.log('AUDITION RESPONSE', auditContractResponse);
    } catch (error) {
      dispatchAuditContract({
        state: EReducerState.error,
        payload: null
      });

      console.error('ERROR AUDITING CONTRACT', error);
    }
  }

  return (
    <div className='flex w-full max-w-[1140px] flex-col gap-y-5'>
      <BorderedContainer
        className='bg-cover md:mt-16 md:bg-contain'
        style={{
          background: `url(${stepBackground}) no-repeat`
        }}
      >
        <Suspense fallback={<Skeleton className='h-40 w-[95%] rounded-3xl' />}>
          <HeaderSection chainsName={chainConfig.name} chainsDocumentationLink={chainConfig.docs} />
        </Suspense>
      </BorderedContainer>

      <BorderedContainer>
        <Suspense fallback={<Skeleton className='h-60 w-[95%] rounded-3xl' />}>
          <TemplatesSection
            chainsName={chainConfig.name}
            templates={chainConfig.templates}
            activeTemplateName={activeTemplateName}
            setActiveTemplateName={setActiveTemplateName}
          />
        </Suspense>

        <Suspense fallback={<Skeleton className='h-60 w-[95%] rounded-3xl' />}>
          <div className='flex w-full flex-col items-start'>
            <PromptSection
              chainsName={chainConfig.name}
              predefinedPrompts={predefinedPromptsState.prompts}
              userPrompt={userPrompt}
              setUserPrompt={setUserPrompt}
            />

            <div className='mt-5 flex w-full flex-col items-center justify-center gap-y-5 px-5 md:flex-row md:items-start md:justify-between md:px-10'>
              <Button
                disabled={isGenerationLoading}
                onClick={() => initCreation()}
                className='w-full md:w-60'
              >
                {isGenerationLoading ? (
                  <div className='flex items-center gap-x-2.5'>
                    <Loader2 className='animate-spin' />
                    <span>Generating Smart Contract</span>
                  </div>
                ) : (
                  <span>Generate Smart Contract</span>
                )}
              </Button>

              <ContractCreationSteps steps={creationSteps} />
            </div>
          </div>
        </Suspense>
      </BorderedContainer>

      {auditContractState.isSuccess && auditContractState.audit ? (
        <BorderedContainer>
          <Suspense fallback={<Skeleton className='h-60 w-[95%] rounded-3xl' />}>
            <AuditSection chainsName={chainConfig.name} audit={auditContractState.audit} />
          </Suspense>
        </BorderedContainer>
      ) : null}

      {generateContractState.contractCode ? (
        <BorderedContainer>
          <Suspense fallback={<Skeleton className='h-60 w-[95%] rounded-3xl' />}>
            <CodeViewerSection
              chainsName={chainConfig.name}
              smartContractCode={generateContractState.contractCode}
              smartContractFileExtension={chainConfig.contractFileExtension}
              contractArtifacts={isGenerationCompleted ? compileContractState.artifact : null}
            />
          </Suspense>
        </BorderedContainer>
      ) : null}
    </div>
  );
}

