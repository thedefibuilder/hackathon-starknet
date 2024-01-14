/* eslint-disable unicorn/no-array-reduce */

import React, { Suspense } from 'react';

import type { TVulnerability, TVulnerabilitySeverity } from '@/sdk/src/types';

import { cn } from '@/lib/utils';

import { Card, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';
import { Skeleton } from '../ui/skeleton';
import SectionContainer from './container';

const DownloadAuditButton = React.lazy(() => import('../download-audit-button'));

interface IAuditSection {
  chainsName: string;
  audit: TVulnerability[];
}

export default function AuditSection({ chainsName, audit }: IAuditSection) {
  const lowSeverityCount = audit
    .filter((response) => response.severity)
    .reduce((accumulator, currentAudit) => {
      return currentAudit.severity === 'Low' ? accumulator + 1 : accumulator;
    }, 0);

  const mediumSeverityCount = audit
    .filter((response) => response.severity)
    .reduce((accumulator, currentAudit) => {
      return currentAudit.severity === 'Medium' ? accumulator + 1 : accumulator;
    }, 0);
  const highSeverityCount = audit
    .filter((response) => response.severity)
    .reduce((accumulator, currentAudit) => {
      return currentAudit.severity === 'High' ? accumulator + 1 : accumulator;
    }, 0);

  const auditScore = calculateAuditScore(audit);

  return (
    <SectionContainer>
      <div className='flex flex-col items-start justify-between md:flex-row'>
        <div className='flex flex-col'>
          <h3 className='text-xl font-semibold md:text-2xl lg:text-3xl'>Smart Contract Audit</h3>
          <h4 className='text-base font-medium text-muted-foreground md:text-lg'>
            Get to know how&apos;s your {chainsName} Smart Contract
          </h4>
        </div>

        {audit.length > 0 && (
          <Suspense fallback={<Skeleton className='h-10 w-40' />}>
            <DownloadAuditButton audit={audit} />
          </Suspense>
        )}
      </div>

      <div className='mt-5 flex w-full flex-col gap-2.5 sm:flex-row'>
        <Card className='h-full w-full sm:w-1/3'>
          <CardHeader className='relative h-24'>
            <CardTitle>Audit score</CardTitle>

            <Progress
              value={auditScore}
              max={100}
              className={cn('w-full', {
                '[&>div]:bg-red-400': auditScore < 35,
                '[&>div]:bg-yellow-400': auditScore >= 35 && auditScore < 65,
                '[&>div]:bg-green-400': auditScore >= 65
              })}
            />

            <span className='absolute -bottom-0 right-6'>{auditScore} %</span>
          </CardHeader>

          <Separator className='mt-2.5 h-[1px] w-full bg-border' />

          <div className='flex flex-col justify-between gap-y-1.5 p-6'>
            <div className='flex justify-between'>
              <p>Low severity:</p>
              <p className='font-bold'>{lowSeverityCount}</p>
            </div>

            <div className='flex justify-between'>
              <p>Medium severity:</p>
              <p className='font-bold'>{mediumSeverityCount}</p>
            </div>

            <div className='flex justify-between'>
              <p>High severity:</p>
              <p className='font-bold'>{highSeverityCount}</p>
            </div>
          </div>
        </Card>

        <Card className='mt-2 h-full w-full overflow-hidden sm:m-2 sm:mt-0 sm:w-2/3'>
          <CardHeader className='h-24'>
            <CardTitle>Risk factors</CardTitle>
          </CardHeader>

          <Separator className='mt-2.5 h-[1px] w-full bg-border' />

          <div className='flex h-full flex-col justify-between gap-y-1.5 overflow-scroll p-6'>
            {audit.length === 0 ? (
              <p>No relevant risks to show.</p>
            ) : (
              <>
                {audit.map((audit, index) => (
                  <div key={`${audit.title}-${index}`} className='flex justify-between'>
                    <p>{audit.title}</p>
                    <p
                      className={cn('font-bold uppercase', {
                        'text-red-400': audit.severity === 'High',
                        'text-yellow-400': audit.severity === 'Medium',
                        'text-green-400': audit.severity === 'Low'
                      })}
                    >
                      {audit.severity}
                    </p>
                  </div>
                ))}
              </>
            )}
          </div>
        </Card>
      </div>
    </SectionContainer>
  );
}

function calculateAuditScore(audit: TVulnerability[]) {
  const severityValue: { [key in TVulnerabilitySeverity]: number } = {
    Low: 3,
    Medium: 2,
    High: 1
  };

  const severityOccurrences: { [key in TVulnerabilitySeverity]: number } = {
    Low: 0,
    Medium: 0,
    High: 0
  };

  for (const object of audit) {
    const severity = object.severity;

    severityOccurrences[severity]++;
  }

  const totalScore = audit.reduce((accumulator, object) => {
    const severity = object.severity;

    return accumulator + severityValue[severity] / severityOccurrences[severity];
  }, 0);

  const maxScore = Object.values(severityOccurrences).reduce(
    (accumulator, value) => accumulator + value * 3,
    0
  );

  return Number(((totalScore / maxScore) * 100).toFixed(2));
}
