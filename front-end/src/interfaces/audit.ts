/* eslint-disable semi */

import type { VulnerabilitySeverity } from '@/sdk/src/types';

export default interface IAudit {
  title: string;
  severity: VulnerabilitySeverity;
  description: string;
}
