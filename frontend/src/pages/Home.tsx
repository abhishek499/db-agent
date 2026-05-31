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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6M9 16h4" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-slate-900">DB Agent</h1>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <span className="text-sm text-slate-500 hidden sm:block">{user.email}</span>
            )}
            <button
              onClick={() => navigate('/new')}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Agent
            </button>
            <button
              onClick={logout}
              title="Sign out"
              className="p-2 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats bar */}
        {!loading && !error && (
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-medium text-slate-500">
              {agents.length === 0 ? 'No agents yet' : `${agents.length} agent${agents.length === 1 ? '' : 's'}`}
            </h2>
            <button onClick={load} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
              Refresh
            </button>
          </div>
        )}

        {loading && (
          <div className="text-center py-20 text-slate-400">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading agents...
          </div>
        )}

        {error && (
          <div className="text-center py-20">
            <p className="text-red-600 text-sm mb-3">{error}</p>
            <button onClick={load} className="text-sm text-indigo-600 hover:underline">Retry</button>
          </div>
        )}

        {!loading && !error && agents.length === 0 && (
          <div className="text-center py-24">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 5.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
              </svg>
            </div>
            <h3 className="text-slate-700 font-medium mb-1">No agents yet</h3>
            <p className="text-slate-400 text-sm mb-6">Connect your first database to get started.</p>
            <button
              onClick={() => navigate('/new')}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Create your first agent
            </button>
          </div>
        )}

        {!loading && !error && agents.length > 0 && (() => {
          const myAgents     = agents.filter(a => !a.owner_id || a.owner_id === user?.user_id)
          const sharedAgents = agents.filter(a => a.owner_id && a.owner_id !== user?.user_id)
          const cardProps = (a: typeof agents[0]) => ({
            key: a.agent_id,
            agent: a,
            onDelete: handleDelete,
            onUpdate: (updated: typeof a) => setAgents(prev => prev.map(x => x.agent_id === updated.agent_id ? updated : x)),
          })
          return (
            <div className="space-y-8">
              {myAgents.length > 0 && (
                <div>
                  {sharedAgents.length > 0 && (
                    <h3 className="text-sm font-medium text-slate-500 mb-3">My agents</h3>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {myAgents.map(a => <AgentCard {...cardProps(a)} />)}
                  </div>
                </div>
              )}
              {sharedAgents.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-3">Available to you</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sharedAgents.map(a => <AgentCard {...cardProps(a)} />)}
                  </div>
                </div>
              )}
            </div>
          )
        })()}
      </main>
    </div>
  )
}
