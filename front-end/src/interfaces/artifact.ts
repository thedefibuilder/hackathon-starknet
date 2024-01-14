/* eslint-disable semi */

import type { CairoAssembly, CompiledSierra } from 'starknet';

export default interface IArtifact {
  sierra: CompiledSierra;
  casm: CairoAssembly;
  classHash: string;
}
