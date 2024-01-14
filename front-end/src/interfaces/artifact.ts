import { CairoAssembly, CompiledSierra, CompiledSierraCasm } from 'starknet';

export default interface IArtifact {
  sierra: CompiledSierra;
  casm: CairoAssembly;
  classHash: string;
}
