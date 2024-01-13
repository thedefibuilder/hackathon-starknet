import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import mongoose from 'mongoose';

import { auditJsonSchema, auditorAgent } from './agents/audit';
import { buildResolverAgent } from './agents/build-resolve';
import { cairoGeneratorAgent } from './agents/cairo-generate';
import SDoc from './db-schemas/docs';
import SPrompt, { TPrompt } from './db-schemas/prompts';
import { BuildResponse, ContractType, Vulnerability } from './types';

dotenv.config();

export class LlmService {
  constructor() {
    mongoose.connect(process.env.MONGO_DB_URI || '').catch((error) => {
      console.log('Error connecting to the DB', error);
    });
  }

  private trimCode(code: string) {
    const codeMatch = new RegExp(`\`\`\`rust([\\s\\S]*?)\`\`\``, 'g').exec(code);
    return codeMatch ? codeMatch[1].trim() : code;
  }

  async getPrompts(): Promise<TPrompt[]> {
    return await SPrompt.find({});
  }

  async callCairoGeneratorLLM(customization: string, contractType: ContractType): Promise<string> {
    const docs = readFileSync(process.cwd() + '/data/starknet-by-example.md', 'utf-8');
    const example = SDoc.findOne({ contractType: contractType }).select('example');
    const responseCode = await cairoGeneratorAgent().invoke({
      docs,
      example,
      customization,
    });

    return this.trimCode(responseCode);
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

  async callAuditorLLM(code: string): Promise<Vulnerability[]> {
    const response = await auditorAgent().invoke({
      code: code,
    });

    return auditJsonSchema.parse(response).audits;
  }

  async callBuildResolverLLM(code: string, compilerError: string): Promise<string> {
    return await buildResolverAgent().invoke({ code, compilerError });
  }
}
