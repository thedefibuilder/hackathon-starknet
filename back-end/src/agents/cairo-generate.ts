import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';

export function cairoGeneratorAgent() {
  const systemMsg =
    'Your function is to interpret user requests specifically for smart contract development in the Cairo language for Starknet blockchain. You must generate complete code exclusively, without any explanatory or conversational text and placeholder comments. Focus on the user-provided documentation and code examples and follow the exact language syntax.';
  const userMsg =
    'Cairo Language Documentation: {docs}. \n\n Template example: {example} \n\n Request: Based on the provided example apply the following customization "{customization}"';

  const prompt = new ChatPromptTemplate({
    promptMessages: [
      SystemMessagePromptTemplate.fromTemplate(systemMsg),
      HumanMessagePromptTemplate.fromTemplate(userMsg),
    ],
    inputVariables: ['docs', 'example', 'customization'],
  });

  const llm = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: 'gpt-4-1106-preview',
    temperature: 0.2,
    modelKwargs: { seed: 1337 },
    verbose: true,
  });

  return prompt.pipe(llm).pipe(new StringOutputParser());
}
