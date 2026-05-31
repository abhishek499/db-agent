import { useEffect, useState } from 'react'
import { getAgentDetail, updateAgent } from '../api'
import AccessSettings from './AccessSettings'
import type { AccessMode, AgentSummary, ScopeMode } from '../types'

interface Props {
  agentId: string
  onClose: () => void
  onSaved: (updated: AgentSummary) => void
}

type Tab = 'general' | 'scope' | 'access'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: 'general',
    label: 'General',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    id: 'scope',
    label: 'Scope',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    id: 'access',
    label: 'Access',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
]

export default function EditAgentModal({ agentId, onClose, onSaved }: Props) {
  const [activeTab,    setActiveTab]    = useState<Tab>('general')
  const [name,         setName]         = useState('')
  const [description,  setDescription]  = useState('')
  const [globalPrompt, setGlobalPrompt] = useState('')
  const [scopeMode,    setScopeMode]    = useState<ScopeMode>('full_db')
  const [userIdColumn, setUserIdColumn] = useState('')
  const [accessMode,   setAccessMode]   = useState<AccessMode>('private')
  const [allowedUsers, setAllowedUsers] = useState<string[]>([])
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState('')
  const [copied,       setCopied]       = useState(false)

  useEffect(() => {
    getAgentDetail(agentId)
      .then(d => {
        setName(d.name)
        setDescription(d.description)
        setGlobalPrompt(d.global_prompt)
        setScopeMode(d.scope_mode)
        setUserIdColumn(d.user_id_column ?? '')
        setAccessMode(d.access_mode)
        setAllowedUsers(d.allowed_users)
      })
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [agentId])

  async function handleSave() {
    if (!name.trim())         { setError('Agent name is required'); return }
    if (!globalPrompt.trim()) { setError('System prompt is required'); return }
    if (scopeMode === 'user_scoped' && !userIdColumn.trim()) {
      setError('User ID column is required for user-scoped mode'); return
    }
    setSaving(true); setError('')
    try {
      const updated = await updateAgent(agentId, {
        name: name.trim(),
        description: description.trim(),
        global_prompt: globalPrompt.trim(),
        scope_mode: scopeMode,
        user_id_column: scopeMode === 'user_scoped' ? userIdColumn.trim() : null,
        access_mode: accessMode,
        allowed_users: allowedUsers,
      })
      onSaved(updated)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl shadow-slate-900/20 w-full max-w-xl max-h-[90vh] flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 text-sm">Agent Settings</h2>
              <p className="text-xs text-slate-400 mt-0.5">Configure how this agent behaves</p>
            </div>
          </div>
          <button onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Tabs ── */}
        {!loading && (
          <div className="flex gap-1 px-6 pt-3 pb-0 shrink-0 border-b border-slate-200">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg transition-colors -mb-px border-b-2 ${
                  activeTab === tab.id
                    ? 'text-indigo-600 border-indigo-600'
                    : 'text-slate-500 border-transparent hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Body ── */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* General tab */}
              {activeTab === 'general' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Agent name <span className="text-red-400">*</span>
                    </label>
                    <input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. Sales Analytics Agent"
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                    <input
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="What does this agent do?"
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      System prompt <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      value={globalPrompt}
                      onChange={e => setGlobalPrompt(e.target.value)}
                      rows={5}
                      placeholder="You are a helpful data analyst for…"
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none leading-relaxed"
                    />
                    <p className="text-xs text-slate-400 mt-1.5">Sets the personality and context for every query.</p>
                  </div>
                </div>
              )}

              {/* Scope tab */}
              {activeTab === 'scope' && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-500">Control what data this agent can access.</p>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { value: 'full_db',     title: 'Full database', desc: 'Agent can query all rows across all tables without any user-level filtering.' },
                      { value: 'user_scoped', title: 'User scoped',   desc: 'Results are automatically filtered by a user ID column. Ideal for multi-tenant apps.' },
                    ] as const).map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setScopeMode(opt.value)}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          scopeMode === opt.value
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`text-sm font-semibold mb-1 ${scopeMode === opt.value ? 'text-indigo-700' : 'text-slate-900'}`}>
                          {opt.title}
                        </div>
                        <div className="text-xs text-slate-500 leading-relaxed">{opt.desc}</div>
                      </button>
                    ))}
                  </div>

                  {scopeMode === 'user_scoped' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        User ID column <span className="text-red-400">*</span>
                      </label>
                      <input
                        value={userIdColumn}
                        onChange={e => setUserIdColumn(e.target.value)}
                        placeholder="e.g. orders.user_id"
                        className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono"
                      />
                      <p className="text-xs text-slate-400 mt-1.5">The column used to filter rows for the requesting user.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Access tab */}
              {activeTab === 'access' && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-500">Control who can access and chat with this agent.</p>
                  <AccessSettings
                    accessMode={accessMode}
                    allowedUsers={allowedUsers}
                    onChange={(mode, users) => { setAccessMode(mode); setAllowedUsers(users) }}
                  />

                  {(accessMode === 'link_only' || accessMode === 'public') && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Share link</label>
                      <div className="flex gap-2">
                        <input
                          readOnly
                          value={`${window.location.origin}/chat/${agentId}`}
                          className="flex-1 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-600 bg-slate-50 font-mono focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/chat/${agentId}`)
                            setCopied(true); setTimeout(() => setCopied(false), 2000)
                          }}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors shrink-0 ${
                            copied
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                              : 'border border-slate-300 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          {copied ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="mt-4 flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                  <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        {!loading && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/50 rounded-b-2xl shrink-0">
            <button onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-indigo-500/20"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Save changes
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
