import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deleteAgent, listAgents } from '../api'
import AgentCard from '../components/AgentCard'
import { useAuth } from '../context/AuthContext'
import type { AgentSummary } from '../types'

export default function Home() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [agents,  setAgents]  = useState<AgentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  async function load() {
    setLoading(true); setError('')
    try {
      setAgents(await listAgents())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleDelete(id: string) {
    if (!confirm('Delete this agent? This cannot be undone.')) return
    try {
      await deleteAgent(id)
      setAgents(prev => prev.filter(a => a.agent_id !== id))
    } catch (e) {
      alert((e as Error).message)
    }
  }

  const myAgents     = agents.filter(a => !a.owner_id || a.owner_id === user?.user_id)
  const sharedAgents = agents.filter(a => a.owner_id && a.owner_id !== user?.user_id)

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm shadow-indigo-500/30">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
            </div>
            <span className="font-bold text-slate-900 text-[15px]">DB Agent</span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="w-5 h-5 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-indigo-700 text-xs font-bold uppercase">
                    {user.email[0]}
                  </span>
                </div>
                <span className="text-xs text-slate-500 font-medium max-w-[180px] truncate">{user.email}</span>
              </div>
            )}
            <button
              onClick={() => navigate('/new')}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm shadow-indigo-500/20"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Agent
            </button>
            <button
              onClick={logout}
              title="Sign out"
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">

        {/* ── Loading ── */}
        {loading && (
          <div className="text-center py-24 text-slate-400">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Loading agents…</p>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="text-center py-24">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-slate-700 font-medium mb-1">Failed to load agents</p>
            <p className="text-red-500 text-sm mb-4">{error}</p>
            <button onClick={load} className="text-sm text-indigo-600 hover:underline font-medium">Retry</button>
          </div>
        )}

        {/* ── Empty ── */}
        {!loading && !error && agents.length === 0 && (
          <div className="text-center py-24">
            <div className="w-16 h-16 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 5.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
              </svg>
            </div>
            <h3 className="text-slate-800 font-semibold text-lg mb-2">No agents yet</h3>
            <p className="text-slate-400 text-sm mb-6 max-w-xs mx-auto">Connect your first database to start chatting with your data in plain English.</p>
            <button
              onClick={() => navigate('/new')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-indigo-500/20"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Create your first agent
            </button>
          </div>
        )}

        {/* ── Agent list ── */}
        {!loading && !error && agents.length > 0 && (
          <div className="space-y-8">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500 font-medium">
                {agents.length} agent{agents.length !== 1 ? 's' : ''}
              </p>
              <button onClick={load}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>

            {myAgents.length > 0 && (
              <div>
                {sharedAgents.length > 0 && (
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">My agents</h3>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myAgents.map(a => (
                    <AgentCard
                      key={a.agent_id}
                      agent={a}
                      onDelete={handleDelete}
                      onUpdate={updated => setAgents(prev => prev.map(x => x.agent_id === updated.agent_id ? updated : x))}
                    />
                  ))}
                </div>
              </div>
            )}

            {sharedAgents.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Shared with you</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sharedAgents.map(a => (
                    <AgentCard
                      key={a.agent_id}
                      agent={a}
                      onDelete={handleDelete}
                      onUpdate={updated => setAgents(prev => prev.map(x => x.agent_id === updated.agent_id ? updated : x))}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
