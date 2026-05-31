import { useState } from 'react'
import type { AccessMode } from '../types'

interface Props {
  accessMode: AccessMode
  allowedUsers: string[]
  onChange: (mode: AccessMode, users: string[]) => void
}

const OPTIONS: { value: AccessMode; title: string; desc: string; icon: React.ReactNode }[] = [
  {
    value: 'private',
    title: 'Only me',
    desc: 'Only you can access this agent.',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    value: 'restricted',
    title: 'Specific users',
    desc: 'Only users you invite by email.',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    value: 'link_only',
    title: 'Anyone with link',
    desc: 'Anyone who has the URL can chat.',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
  {
    value: 'public',
    title: 'Public',
    desc: 'Anyone can find and use this agent.',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
]

export default function AccessSettings({ accessMode, allowedUsers, onChange }: Props) {
  const [emailInput, setEmailInput] = useState('')

  function addEmail() {
    const e = emailInput.trim().toLowerCase()
    if (!e || !e.includes('@')) return
    if (!allowedUsers.includes(e)) {
      onChange(accessMode, [...allowedUsers, e])
    }
    setEmailInput('')
  }

  function removeEmail(email: string) {
    onChange(accessMode, allowedUsers.filter(e => e !== email))
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value, allowedUsers)}
            className={`p-3 rounded-lg border text-left transition-all ${
              accessMode === opt.value
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className={`mb-1 ${accessMode === opt.value ? 'text-indigo-600' : 'text-slate-400'}`}>
              {opt.icon}
            </div>
            <div className="text-sm font-medium text-slate-900">{opt.title}</div>
            <div className="text-xs text-slate-500 mt-0.5">{opt.desc}</div>
          </button>
        ))}
      </div>

      {accessMode === 'restricted' && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="email"
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEmail() } }}
              placeholder="user@example.com"
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={addEmail}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Add
            </button>
          </div>
          {allowedUsers.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {allowedUsers.map(email => (
                <span key={email} className="flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs">
                  {email}
                  <button onClick={() => removeEmail(email)} className="hover:text-red-500 transition-colors">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}
          {allowedUsers.length === 0 && (
            <p className="text-xs text-slate-400">Add at least one email address.</p>
          )}
        </div>
      )}

      {accessMode === 'link_only' && (
        <p className="text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Share the agent URL with people you want to give access to.
        </p>
      )}
    </div>
  )
}
