import dotenv from 'dotenv';
import { readFileSync } from 'fs';

import { cairoGeneratorAgent } from './agents/cairo-generate';

dotenv.config();

export type GeneratorPromptArgs = {
  description: string;
  contractType: string;
};

export class LlmService {
  async callCairoGeneratorLLM(promptArgs: GeneratorPromptArgs) {
    const docs = readFileSync(__dirname + '/data/starknet-by-example.md', 'utf-8');
    const cairoGenerator = await cairoGeneratorAgent();
    const response = await cairoGenerator.invoke({
      docs,
      description: promptArgs.description,
      contractType: promptArgs.contractType,
    });
    console.log(response);
    return response;
  }
}

const llmService = new LlmService();
llmService.callCairoGeneratorLLM({
  description: 'Must have name XOX and symbol YOY and max supply of 1 million and minting price of 1 ETH',
  contractType: 'ERC20 Token',
});
