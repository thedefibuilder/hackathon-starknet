import { ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';

import { jsonAgent } from './json';

export const auditJsonSchema = z.object({
  audits: z
    .array(
      z.object({
        title: z.string().describe("Short description of the issue. Example: 'Reentrancy attack'"),
        severity: z.enum(['High', 'Medium', 'Low']).describe('Severity of the issue'),
        description: z.string().describe('Detailed description of the issue'),
      }),
    )
    .describe('List of issues found in the smart contract'),
});

export function auditorAgent() {
  const systemMsg = `Your task is to analyze and assess smart contracts for auditing purposes by identifying the severity of the vulnerabilities, summarize them in a short title and description. Do not specify overflow/underflow vulnerabilities. The report should be generated in JSON format and should always follow the provided schema.`;
  const userMsg = `Generate a smart contract auditing report in JSON format by carefully including the title, severity and description of the issue, given the following code: {code}`;

  const prompt = new ChatPromptTemplate({
    promptMessages: [
      SystemMessagePromptTemplate.fromTemplate(systemMsg),
      HumanMessagePromptTemplate.fromTemplate(userMsg),
    ],
    inputVariables: ['code'],
  });

  return prompt.pipe(jsonAgent('gpt-4-1106-preview', auditJsonSchema));
}
