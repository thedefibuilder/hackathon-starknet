import React from 'react';

import { BrowserRouter, Route, Routes } from 'react-router-dom';

import Layout from './components/layout';
import { Toaster } from './components/ui/toast/toaster';
import HomePage from './pages/home';
import NotFoundPage from './pages/not-found';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path='/' element={<HomePage />} />
          <Route path='*' element={<NotFoundPage />} />
        </Routes>

        <Toaster />
      </Layout>
    </BrowserRouter>
  );
}

export default App;
