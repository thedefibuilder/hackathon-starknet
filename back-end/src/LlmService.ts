import dotenv from 'dotenv';
import { readFileSync } from 'fs';

import { auditJsonSchema, auditorAgent } from './agents/audit';
import { buildResolverAgent } from './agents/build-resolve';
import { cairoGeneratorAgent } from './agents/cairo-generate';
import { BuildResponse, Vulnerability } from './types';

dotenv.config();

export class LlmService {
  async callCairoGeneratorLLM(description: string, contractType: string): Promise<string> {
    const docs = readFileSync(__dirname + '/data/starknet-by-example.md', 'utf-8');
    const cairoGenerator = await cairoGeneratorAgent();

    return await cairoGenerator.invoke({
      docs,
      description,
      contractType,
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
