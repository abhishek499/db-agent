import { useEffect, useState } from 'react'
import { getAgentDetail, updateAgent } from '../api'
import AccessSettings from './AccessSettings'
import type { AccessMode, AgentSummary, ScopeMode } from '../types'

interface Props {
  agentId: string
  onClose: () => void
  onSaved: (updated: AgentSummary) => void
}

export default function EditAgentModal({ agentId, onClose, onSaved }: Props) {
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
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <h2 className="font-semibold text-slate-900">Edit agent</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Agent name <span className="text-red-400">*</span>
                </label>
                <input value={name} onChange={e => setName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <input value={description} onChange={e => setDescription(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  System prompt <span className="text-red-400">*</span>
                </label>
                <textarea value={globalPrompt} onChange={e => setGlobalPrompt(e.target.value)} rows={4}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                <p className="text-xs text-slate-400 mt-1">Sets the tone for every query.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Query scope</label>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { value: 'full_db',     title: 'Full database', desc: 'Access to all rows.' },
                    { value: 'user_scoped', title: 'User scoped',   desc: 'Filtered per user ID.' },
                  ] as const).map(opt => (
                    <button key={opt.value} onClick={() => setScopeMode(opt.value)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        scopeMode === opt.value
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}>
                      <div className="text-sm font-medium text-slate-900">{opt.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {scopeMode === 'user_scoped' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    User ID column <span className="text-red-400">*</span>
                  </label>
                  <input value={userIdColumn} onChange={e => setUserIdColumn(e.target.value)}
                    placeholder="e.g. orders.user_id"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Access control</label>
                <AccessSettings
                  accessMode={accessMode}
                  allowedUsers={allowedUsers}
                  onChange={(mode, users) => { setAccessMode(mode); setAllowedUsers(users) }}
                />
              </div>

              {(accessMode === 'link_only' || accessMode === 'public') && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Share link</label>
                  <div className="flex gap-2">
                    <input readOnly value={`${window.location.origin}/chat/${agentId}`}
                      className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 bg-slate-50 font-mono" />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/chat/${agentId}`)
                        setCopied(true); setTimeout(() => setCopied(false), 2000)
                      }}
                      className="px-3 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 transition-colors shrink-0"
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && (
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-200 shrink-0">
            <button onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg text-sm font-medium transition-colors">
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
