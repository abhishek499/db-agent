import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { finalizeAgent } from '../../api'
import AccessSettings from '../../components/AccessSettings'
import type { AccessMode } from '../../types'

interface Props {
  draftId: string
  onBack: () => void
}

export default function StepFinalize({ draftId, onBack }: Props) {
  const navigate = useNavigate()
  const [name,         setName]         = useState('')
  const [description,  setDescription]  = useState('')
  const [globalPrompt, setGlobalPrompt] = useState('')
  const [scopeMode,    setScopeMode]    = useState<'full_db' | 'user_scoped'>('full_db')
  const [userIdColumn, setUserIdColumn] = useState('')
  const [accessMode,   setAccessMode]   = useState<AccessMode>('private')
  const [allowedUsers, setAllowedUsers] = useState<string[]>([])
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')

  async function handlePublish() {
    if (!name.trim())        { setError('Agent name is required'); return }
    if (!globalPrompt.trim()) { setError('System prompt is required'); return }
    if (scopeMode === 'user_scoped' && !userIdColumn.trim()) {
      setError('User ID column is required for user-scoped mode')
      return
    }
    setLoading(true); setError('')
    try {
      const agent = await finalizeAgent(draftId, {
        name: name.trim(),
        description: description.trim(),
        global_prompt: globalPrompt.trim(),
        scope_mode: scopeMode,
        user_id_column: userIdColumn.trim() || null,
        access_mode: accessMode,
        allowed_users: allowedUsers,
      })
      navigate(`/chat/${agent.agent_id}`)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Configure your agent</h2>
          <p className="text-slate-500 text-sm mt-1">Name it, set its personality, and choose who can query what.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Agent name <span className="text-red-400">*</span></label>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. Store Analytics Assistant"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <input value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Brief description of what this agent helps with"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">System prompt <span className="text-red-400">*</span></label>
          <textarea value={globalPrompt} onChange={e => setGlobalPrompt(e.target.value)} rows={4}
            placeholder="You are a helpful analytics assistant. Answer questions about orders, customers, and products concisely and accurately."
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
          <p className="text-xs text-slate-400 mt-1">Sets the tone for every query. Be specific about your domain.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Query scope</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'full_db', title: 'Full database', desc: 'Access to all rows. Great for admin dashboards and analytics.' },
              { value: 'user_scoped', title: 'User scoped', desc: 'Each caller only sees their own rows. Requires a user ID per query.' },
            ].map(opt => (
              <button key={opt.value} onClick={() => setScopeMode(opt.value as typeof scopeMode)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  scopeMode === opt.value
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}>
                <div className="text-sm font-medium text-slate-900 mb-1">{opt.title}</div>
                <div className="text-xs text-slate-500">{opt.desc}</div>
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
              placeholder="e.g. orders.user_id or user_id"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <p className="text-xs text-slate-400 mt-1">The column used to filter rows to the current user.</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Access control</label>
          <p className="text-xs text-slate-400 mb-3">Control who can chat with this agent.</p>
          <AccessSettings
            accessMode={accessMode}
            allowedUsers={allowedUsers}
            onChange={(mode, users) => { setAccessMode(mode); setAllowedUsers(users) }}
          />
        </div>

        {error && (
          <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        )}
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50 transition-colors">
          Back
        </button>
        <button onClick={handlePublish} disabled={loading}
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg text-sm font-medium transition-colors">
          {loading ? 'Publishing...' : 'Publish agent'}
        </button>
      </div>
    </div>
  )
}
