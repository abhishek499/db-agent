import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { getAgent, sendMessage } from '../api'
import { useAuth } from '../context/AuthContext'
import ResultTable from '../components/ResultTable'
import SchemaPanel from '../components/SchemaPanel'
import EditAgentModal from '../components/EditAgentModal'
import type { AgentSummary, ChatResponse } from '../types'

interface Message {
  role: 'user' | 'assistant'
  text: string
  response?: ChatResponse
}

const DB_BADGE: Record<string, string> = {
  postgresql: 'bg-blue-100 text-blue-700',
  mysql:      'bg-amber-100 text-amber-700',
  sqlite:     'bg-sky-100 text-sky-700',
  mongodb:    'bg-emerald-100 text-emerald-700',
}

const SUGGESTIONS = [
  'What tables are in this database?',
  'Show me the most recent 10 records',
  'How many total rows are there?',
  'What are the most common values in each column?',
]

export default function Chat() {
  const { agentId } = useParams<{ agentId: string }>()
  const navigate = useNavigate()
  const { user }  = useAuth()

  const [agent,      setAgent]      = useState<AgentSummary | null>(null)
  const [msgs,       setMsgs]       = useState<Message[]>([])
  const [input,      setInput]      = useState('')
  const [userId,     setUserId]     = useState('')
  const [sending,    setSending]    = useState(false)
  const [loadErr,    setLoadErr]    = useState('')
  const [schemaOpen, setSchemaOpen] = useState(false)
  const [editOpen,   setEditOpen]   = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  const isOwner = !agent?.owner_id || agent?.owner_id === user?.user_id

  useEffect(() => {
    if (!agentId) return
    getAgent(agentId)
      .then(setAgent)
      .catch(e => setLoadErr((e as Error).message))
  }, [agentId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  async function handleSend(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || !agentId || sending) return
    if (agent?.scope_mode === 'user_scoped' && !userId.trim()) {
      alert('This agent requires a User ID.')
      return
    }
    setMsgs(prev => [...prev, { role: 'user', text: msg }])
    setInput('')
    setSending(true)
    try {
      const resp = await sendMessage(agentId, msg, userId.trim() || undefined)
      setMsgs(prev => [...prev, {
        role: 'assistant',
        text: resp.error ? resp.error : (resp.answer || 'No answer returned.'),
        response: resp,
      }])
    } catch (e) {
      setMsgs(prev => [...prev, { role: 'assistant', text: (e as Error).message }])
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  // Auto-resize textarea
  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }

  if (loadErr) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-sm px-6">
          <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-slate-700 font-medium mb-1">Failed to load agent</p>
          <p className="text-slate-400 text-sm mb-4">{loadErr}</p>
          <button onClick={() => navigate('/dashboard')}
            className="text-sm text-indigo-600 hover:underline font-medium">
            ← Back to dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50">

      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 shrink-0 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          {/* Back */}
          <button
            onClick={() => navigate('/dashboard')}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Back to dashboard"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Agent avatar */}
          <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
            <svg className="w-4.5 h-4.5 text-indigo-600 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
          </div>

          {/* Name + meta */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-slate-900 truncate text-sm">{agent?.name ?? '...'}</h1>
              {agent && (
                <span className={`hidden sm:inline px-2 py-0.5 rounded-full text-xs font-medium ${DB_BADGE[agent.db_type] ?? 'bg-slate-100 text-slate-600'}`}>
                  {agent.db_type}
                </span>
              )}
            </div>
            {agent && (
              <p className="text-xs text-slate-400 mt-0.5">
                {agent.table_count} tables · {agent.scope_mode === 'user_scoped' ? 'user scoped' : 'full db'}
              </p>
            )}
          </div>

          {/* User ID for scoped agents */}
          {agent?.scope_mode === 'user_scoped' && (
            <input
              value={userId}
              onChange={e => setUserId(e.target.value)}
              placeholder="User ID"
              className="hidden sm:block border border-slate-200 rounded-lg px-3 py-1.5 text-xs w-32 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
            />
          )}

          {/* Schema button */}
          <button
            onClick={() => setSchemaOpen(true)}
            title="View schema"
            className="shrink-0 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <svg className="w-4.5 h-4.5 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M10 4v16M14 4v16" />
            </svg>
          </button>

          {/* Settings — owner only */}
          {isOwner && (
            <button
              onClick={() => setEditOpen(true)}
              title="Agent settings"
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </button>
          )}
        </div>
      </header>

      {/* Panels */}
      {schemaOpen && agentId && (
        <SchemaPanel agentId={agentId} onClose={() => setSchemaOpen(false)} />
      )}
      {editOpen && agentId && (
        <EditAgentModal
          agentId={agentId}
          onClose={() => setEditOpen(false)}
          onSaved={updated => { setAgent(updated); setEditOpen(false) }}
        />
      )}

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto py-6">
        <div className="max-w-3xl mx-auto px-4 space-y-5">

          {msgs.length === 0 && (
            <div className="pt-12 pb-6">
              {/* Empty state header */}
              <div className="text-center mb-8">
                <div className="w-14 h-14 bg-white border border-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <svg className="w-7 h-7 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <h2 className="text-base font-semibold text-slate-800 mb-1">
                  {agent ? `Chat with ${agent.name}` : 'Loading…'}
                </h2>
                <p className="text-sm text-slate-400">Ask anything about your data in plain English</p>
              </div>

              {/* Suggestion chips */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="group flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl text-left text-sm text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-all"
                  >
                    <svg className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {msgs.map((msg, i) => (
            <div key={i} className={`flex items-end gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0 mb-0.5">
                  <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                </div>
              )}

              {msg.role === 'user' ? (
                <div className="max-w-xl bg-indigo-600 text-white px-4 py-3 rounded-2xl rounded-br-sm text-sm leading-relaxed shadow-sm shadow-indigo-500/20">
                  {msg.text}
                </div>
              ) : (
                <AssistantMessage msg={msg} />
              )}
            </div>
          ))}

          {sending && (
            <div className="flex items-end gap-2.5 justify-start">
              <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3.5 shadow-sm flex items-center gap-2">
                <div className="flex gap-1">
                  {[0, 1, 2].map(d => (
                    <div key={d}
                      className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${d * 0.15}s`, animationDuration: '0.8s' }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Input ── */}
      <div className="bg-white border-t border-slate-200 px-4 py-4 shrink-0">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-2 bg-white border border-slate-300 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all shadow-sm">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKey}
              placeholder="Ask a question about your data…"
              rows={1}
              disabled={sending}
              className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none resize-none max-h-40 leading-relaxed disabled:opacity-50"
              style={{ minHeight: '24px' }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || sending}
              className="shrink-0 w-8 h-8 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white rounded-xl flex items-center justify-center transition-colors mb-0.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </div>
          <p className="text-center text-xs text-slate-300 mt-2">Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </div>
  )
}

// ─── Assistant message bubble ─────────────────────────────────────────────────

function AssistantMessage({ msg }: { msg: Message }) {
  const [showQuery,   setShowQuery]   = useState(false)
  const [showResults, setShowResults] = useState(false)
  const hasQuery   = !!msg.response?.generated_query
  const hasResults = !!msg.response?.results && msg.response.results.row_count > 0
  const isError    = !!msg.response?.error

  return (
    <div className="max-w-2xl bg-white border border-slate-200 rounded-2xl rounded-bl-sm shadow-sm overflow-hidden">
      <div className={`px-4 pt-4 pb-3 text-sm leading-relaxed prose prose-sm max-w-none ${isError ? 'text-red-600' : 'text-slate-800'}`}>
        <ReactMarkdown>{msg.text}</ReactMarkdown>
      </div>

      {(hasQuery || hasResults) && (
        <div className="flex gap-1 px-3 pb-3">
          {hasQuery && (
            <button
              onClick={() => setShowQuery(v => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                showQuery
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              {showQuery ? 'Hide query' : 'Show query'}
            </button>
          )}
          {hasResults && (
            <button
              onClick={() => setShowResults(v => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                showResults
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M10 4v16M14 4v16" />
              </svg>
              {showResults ? 'Hide data' : `${msg.response!.results!.row_count} rows`}
            </button>
          )}
        </div>
      )}

      {showQuery && msg.response?.generated_query && (
        <div className="border-t border-slate-100 mx-0">
          <pre className="text-xs bg-slate-950 text-slate-200 px-4 py-4 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
            {msg.response.generated_query}
          </pre>
        </div>
      )}

      {showResults && msg.response?.results && (
        <div className="border-t border-slate-100">
          <ResultTable result={msg.response.results} />
        </div>
      )}
    </div>
  )
}
