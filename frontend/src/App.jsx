import React from 'react'
import TemplatesPage from './views/TemplatesPage.jsx'
import { ToastProvider } from './stores/toastStore.jsx'

export default function App(){
  return (
    <ToastProvider>
      <div>
        <TemplatesPage />
      </div>
    </ToastProvider>
  )
}
