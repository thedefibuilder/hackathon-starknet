import { Schema, model } from 'mongoose';

export type TDoc = {
  template: string;
  example: string;
};

const docSchema = new Schema<TDoc>({
  template: { type: String, required: true },
  example: { type: String, required: true },
});

export default model<TDoc>('SDoc', docSchema, 'docs');
