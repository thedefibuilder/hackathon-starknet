import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';

export function buildResolverAgent() {
  const systemMsg =
    'Your task is to resolve compiler errors from the provided code. You must generate complete smart contract code exclusively without any explanatory or conversational text. You must not change any other parts of the code that are not related to solving the compiler error. You must provide back full code that compiles, not only the parts that need to be fixed.';
  const question = `Resolve the compiler error "{compilerError}" from the following code: \n {code}`;

  const prompt = new ChatPromptTemplate({
    promptMessages: [
      SystemMessagePromptTemplate.fromTemplate(systemMsg),
      HumanMessagePromptTemplate.fromTemplate(question),
    ],
    inputVariables: ['code', 'compilerError'],
  });
  const llm = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: 'gpt-4-1106-preview',
    temperature: 0.2,
    modelKwargs: { seed: 1337 },
  });

  return prompt.pipe(llm).pipe(new StringOutputParser());
}
