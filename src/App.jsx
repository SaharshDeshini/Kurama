import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DataProvider } from './context/DataContext';
import { AppLayout } from './components/layout/AppLayout';

// Pages
import { Home } from './pages/Home';
import { Journal } from './pages/Journal';
import { Notes } from './pages/Notes';
import { EnglishDaily } from './pages/EnglishDaily';

export default function App() {
  return (
    <DataProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/english-daily" element={<EnglishDaily />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </DataProvider>
  );
}
