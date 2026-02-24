import React, { useState } from 'react'
import MainLayout from './components/layout/MainLayout.jsx'
import TemplatesPage from './views/TemplatesPage.jsx'
import TestLogsPage from './views/TestLogsPage.jsx'
import { ToastProvider } from './stores/toastStore.jsx'

export default function App(){
  const [currentPage, setCurrentPage] = useState('dashboard');

  const handleNavigate = (page) => {
    setCurrentPage(page);
  };

  return (
    <ToastProvider>
      <MainLayout currentPage={currentPage} onNavigate={handleNavigate}>
        {currentPage === 'dashboard' && <TemplatesPage />}
        {currentPage === 'test-logs' && <TestLogsPage />}
      </MainLayout>
    </ToastProvider>
  )
}
