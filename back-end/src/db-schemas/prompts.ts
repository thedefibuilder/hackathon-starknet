import { Schema, model } from 'mongoose';

export type TPrompt = {
  contracType: string;
  title: string;
  description: string;
};

const promptSchema = new Schema<TPrompt>({
  contracType: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
});

export default model<TPrompt>('SPrompt', promptSchema, 'prompts');
