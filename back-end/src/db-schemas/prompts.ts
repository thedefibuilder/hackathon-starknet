import { Schema, model } from 'mongoose';

export type TPrompt = {
  template: string;
  title: string;
  description: string;
};

const promptSchema = new Schema<TPrompt>({
  template: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
});

export default model<TPrompt>('SPrompt', promptSchema, 'prompts');
