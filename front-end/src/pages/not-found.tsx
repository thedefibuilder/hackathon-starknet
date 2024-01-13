import React from 'react';

import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <div className='flex h-full w-full flex-col items-center justify-center gap-y-5'>
      <div className='flex flex-col-reverse text-center'>
        <h1 className='text-xl font-semibold md:text-2xl lg:text-3xl'>Page not found</h1>
        <h2 className='text-2xl font-bold text-muted-foreground md:text-3xl lg:text-4xl'>404</h2>
      </div>

      <Button asChild variant='link'>
        <Link to='/' title='Go to homepage' className='md:text-xl'>
          Home
        </Link>
      </Button>
    </div>
  );
}
