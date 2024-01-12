import React from 'react';

import { BrowserRouter, Route, Routes } from 'react-router-dom';

import Layout from './components/layout';
import { Toaster } from './components/ui/toast/toaster';
import FourOuFourPage from './pages/four-ou-four';
import HomePage from './pages/home';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path='/' element={<HomePage />} />
          <Route path='*' element={<FourOuFourPage />} />
        </Routes>

        <Toaster />
      </Layout>
    </BrowserRouter>
  );
}

export default App;
