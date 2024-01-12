import React, { Suspense } from 'react';

import { BrowserRouter, Route, Routes } from 'react-router-dom';

import Layout from './components/layout';
import { Skeleton } from './components/ui/skeleton';

const HomePage = React.lazy(() => import('./pages/home'));
const FourOuFourPage = React.lazy(() => import('./pages/four-ou-four'));

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Suspense fallback={<Skeleton className='h-full w-full' />}>
          <Routes>
            <Route path='/' element={<HomePage />} />
            <Route path='*' element={<FourOuFourPage />} />
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
