import dotenv from 'dotenv';
import { readFileSync } from 'fs';

import { cairoGeneratorAgent } from './agents/cairo-generate';
import { BuildResponse, GeneratorPromptArgs } from './types';

dotenv.config();

export class LlmService {
  async callCairoGeneratorLLM(promptArgs: GeneratorPromptArgs): Promise<string> {
    const docs = readFileSync(__dirname + '/data/starknet-by-example.md', 'utf-8');
    const cairoGenerator = await cairoGeneratorAgent();
    return await cairoGenerator.invoke({
      docs,
      description: promptArgs.description,
      contractType: promptArgs.contractType,
    });
  }

  async buildCairoCode(smartContractCode: string): Promise<BuildResponse> {
    const buildResponse = await fetch(`https://compiler-service.defibuilder.com/api/v1/starknet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': process.env.X_API_KEY || '',
      },
      body: JSON.stringify({ code: smartContractCode }),
    });

    const responseData = (await buildResponse.json()) as BuildResponse;

    return { ...responseData, code: smartContractCode };
  }
}
