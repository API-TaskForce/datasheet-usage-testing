import React, { useState } from 'react'

export default function AuthBadge({ authMethod, authCredential, compact = false }) {
  const [visible, setVisible] = useState(false)

  const EyeOpen = (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )

  const EyeClosed = (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0 1 12 19c-5.523 0-10-4.477-10-10 0-1.017.151-2.003.432-2.922M3 3l18 18" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.58 6.58A9.953 9.953 0 0 1 12 5c5.523 0 10 4.477 10 10 0 1.017-.151 2.003-.432 2.922" />
    </svg>
  )

  return (
    <div className={`flex items-center gap-2 ${compact ? '' : ''}`}>
      {!compact && <p className="badge badge-info">{authMethod}</p>}

      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="p-1 rounded hover:bg-gray-100 focus:outline-none"
        aria-pressed={visible}
        title={visible ? 'Hide credential' : 'Show credential'}
      >
        {visible ? EyeClosed : EyeOpen}
      </button>

      {visible && (
        <code className="text-sm text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
          {authCredential || '(empty)'}
        </code>
      )}
    </div>
  )
}
