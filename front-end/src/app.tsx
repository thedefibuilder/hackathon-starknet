import React from 'react';

import { BrowserRouter } from 'react-router-dom';

import Layout from './components/layout';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <h1 className='text-2xl'>Starknet | DeFi Builder</h1>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
