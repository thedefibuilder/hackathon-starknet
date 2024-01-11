export type GeneratorPromptArgs = {
  description: string;
  contractType: string;
};

export type BuildResponse = {
  success: boolean;
  message: string;
  artifact: unknown; // Hardhat Artifact
  code: string;
};

export type Vulnerability = {
  title: string;
  description: string;
  severity: VulnerabilitySeverity;
};

export type VulnerabilitySeverity = 'High' | 'Medium' | 'Low';
