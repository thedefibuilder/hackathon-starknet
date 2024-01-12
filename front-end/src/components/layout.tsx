import React from 'react';

import Footer from './footer';
import Navbar from './navbar';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />

      <main className='flex h-full flex-col items-center justify-center'>{children}</main>

      <Footer />
    </>
  );
}
