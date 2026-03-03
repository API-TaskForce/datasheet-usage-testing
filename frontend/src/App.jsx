import React, { useState } from 'react'
import MainLayout from './components/layout/MainLayout.jsx'
import TemplatesPage from './views/TemplatesPage.jsx'
import TestLogsPage from './views/TestLogsPage.jsx'
import ApiDashboardView from './views/ApiDashboardView.jsx'
import { ToastProvider } from './stores/toastStore.jsx'

export default function App(){
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const handleNavigate = (page) => {
    setCurrentPage(page);
    if (page === 'dashboard') setSelectedTemplate(null);
  };

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    setCurrentPage('api-dashboard');
  };

  return (
    <ToastProvider>
      <MainLayout currentPage={currentPage} onNavigate={handleNavigate}>
        {currentPage === 'dashboard' && (
          <TemplatesPage onSelectTemplate={handleSelectTemplate} />
        )}
        {currentPage === 'api-dashboard' && (
          <ApiDashboardView template={selectedTemplate} />
        )}
        {currentPage === 'test-logs' && <TestLogsPage />}
      </MainLayout>
    </ToastProvider>
  )
}
