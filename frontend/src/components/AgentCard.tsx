import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import EditAgentModal from './EditAgentModal'
import { useAuth } from '../context/AuthContext'
import type { AgentSummary } from '../types'

const DB_COLORS: Record<string, string> = {
  postgresql: 'bg-blue-100 text-blue-700',
  mysql:      'bg-orange-100 text-orange-700',
  sqlite:     'bg-green-100 text-green-700',
  mongodb:    'bg-emerald-100 text-emerald-700',
}

interface Props {
  agent: AgentSummary
  onDelete: (id: string) => void
  onUpdate: (updated: AgentSummary) => void
}

const ACCESS_LABELS: Record<string, { label: string; color: string }> = {
  private:    { label: 'Private',    color: 'bg-slate-100 text-slate-500' },
  public:     { label: 'Public',     color: 'bg-green-100 text-green-700' },
  link_only:  { label: 'Link only',  color: 'bg-amber-100 text-amber-700' },
  restricted: { label: 'Restricted', color: 'bg-purple-100 text-purple-700' },
}

export default function AgentCard({ agent, onDelete, onUpdate }: Props) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [editOpen, setEditOpen] = useState(false)
  const isOwner = !agent.owner_id || agent.owner_id === user?.user_id

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-900 truncate">{agent.name}</h3>
          {agent.description && (
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{agent.description}</p>
          )}
        </div>
        {isOwner ? (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setEditOpen(true)}
              className="text-slate-300 hover:text-indigo-500 transition-colors"
              title="Edit agent"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(agent.agent_id)}
              className="text-slate-300 hover:text-red-500 transition-colors"
              title="Delete agent"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <span className="text-xs text-slate-400 shrink-0">shared</span>
        )}
      </div>

      {editOpen && (
        <EditAgentModal
          agentId={agent.agent_id}
          onClose={() => setEditOpen(false)}
          onSaved={updated => { onUpdate(updated); setEditOpen(false) }}
        />
      )}

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${DB_COLORS[agent.db_type] ?? 'bg-slate-100 text-slate-600'}`}>
          {agent.db_type}
        </span>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          agent.scope_mode === 'user_scoped'
            ? 'bg-purple-100 text-purple-700'
            : 'bg-slate-100 text-slate-600'
        }`}>
          {agent.scope_mode === 'user_scoped' ? 'user scoped' : 'full db'}
        </span>
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
          {agent.table_count} tables
        </span>
        {(() => {
          const a = ACCESS_LABELS[agent.access_mode]
          return a ? (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.color}`}>{a.label}</span>
          ) : null
        })()}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-100">
        <span className="text-xs text-slate-400">
          {new Date(agent.created_at).toLocaleDateString()}
        </span>
        <button
          onClick={() => navigate(`/chat/${agent.agent_id}`)}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors"
        >
          Open chat
        </button>
      </div>
    </div>
  )
}
