import React from 'react';

import { BrowserRouter } from 'react-router-dom';

import Footer from './components/footer';
import Navbar from './components/navbar';

function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <main className='flex h-full flex-col items-center justify-center'>
        <h1 className='text-2xl'>Starknet | DeFi Builder</h1>
      </main>
      <Footer />
    </BrowserRouter>
  );
}

export default App;
