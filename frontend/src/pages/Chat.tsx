import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { getAgent, sendMessage } from '../api'
import ResultTable from '../components/ResultTable'
import SchemaPanel from '../components/SchemaPanel'
import EditAgentModal from '../components/EditAgentModal'
import type { AgentSummary, ChatResponse } from '../types'

interface Message {
  role: 'user' | 'assistant'
  text: string
  response?: ChatResponse
}

export default function Chat() {
  const { agentId } = useParams<{ agentId: string }>()
  const navigate    = useNavigate()

  const [agent,   setAgent]   = useState<AgentSummary | null>(null)
  const [msgs,    setMsgs]    = useState<Message[]>([])
  const [input,   setInput]   = useState('')
  const [userId,  setUserId]  = useState('')
  const [sending, setSending] = useState(false)
  const [loadErr, setLoadErr] = useState('')
  const [schemaOpen, setSchemaOpen] = useState(false)
  const [editOpen,   setEditOpen]   = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!agentId) return
    getAgent(agentId)
      .then(setAgent)
      .catch(e => setLoadErr((e as Error).message))
  }, [agentId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  async function handleSend() {
    const text = input.trim()
    if (!text || !agentId || sending) return

    if (agent?.scope_mode === 'user_scoped' && !userId.trim()) {
      alert('This agent requires a User ID.')
      return
    }

    setMsgs(prev => [...prev, { role: 'user', text }])
    setInput('')
    setSending(true)

    try {
      const resp = await sendMessage(agentId, text, userId.trim() || undefined)
      setMsgs(prev => [...prev, {
        role: 'assistant',
        text: resp.error ? resp.error : (resp.answer || 'No answer returned.'),
        response: resp,
      }])
    } catch (e) {
      setMsgs(prev => [...prev, {
        role: 'assistant',
        text: (e as Error).message,
      }])
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  if (loadErr) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-sm mb-3">{loadErr}</p>
          <button onClick={() => navigate('/dashboard')} className="text-sm text-indigo-600 hover:underline">
            Back to agents
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 shrink-0">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="text-slate-400 hover:text-slate-700 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="font-semibold text-slate-900 truncate">{agent?.name ?? '...'}</h1>
            {agent && (
              <p className="text-xs text-slate-400">
                {agent.db_type} &middot; {agent.table_count} tables &middot; {agent.scope_mode === 'user_scoped' ? 'user scoped' : 'full db'}
              </p>
            )}
          </div>
          {agent?.scope_mode === 'user_scoped' && (
            <div className="shrink-0">
              <input
                value={userId}
                onChange={e => setUserId(e.target.value)}
                placeholder="User ID"
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}
          <button
            onClick={() => setEditOpen(true)}
            title="Edit agent"
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
          <button
            onClick={() => setSchemaOpen(true)}
            title="View schema"
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M10 4v16M14 4v16" />
            </svg>
            Schema
          </button>
        </div>
      </header>

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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-6">
        <div className="max-w-3xl mx-auto px-4 space-y-4">
        {msgs.length === 0 && (
          <div className="text-center pt-16 text-slate-400">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-500">Ask anything about your data</p>
            <p className="text-xs text-slate-400 mt-1">e.g. "How many orders were placed last month?"</p>
          </div>
        )}

        {msgs.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'user' ? (
              <div className="max-w-xl bg-indigo-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm">
                {msg.text}
              </div>
            ) : (
              <AssistantMessage msg={msg} />
            )}
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1">
                {[0, 1, 2].map(d => (
                  <div key={d} className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${d * 0.15}s` }} />
                ))}
              </div>
              <span className="text-xs text-slate-400">Thinking...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t border-slate-200 px-4 py-3 shrink-0">
        <div className="max-w-3xl mx-auto flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask a question about your data..."
            rows={1}
            className="flex-1 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none max-h-32 overflow-y-auto"
            style={{ minHeight: '42px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="shrink-0 w-10 h-10 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-200 text-white rounded-xl flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
        <p className="text-center text-xs text-slate-300 mt-2">Enter to send &middot; Shift+Enter for new line</p>
      </div>
    </div>
  )
}

function AssistantMessage({ msg }: { msg: Message }) {
  const [showQuery,   setShowQuery]   = useState(false)
  const [showResults, setShowResults] = useState(false)
  const hasQuery   = !!msg.response?.generated_query
  const hasResults = !!msg.response?.results && msg.response.results.row_count > 0
  const isError    = !!msg.response?.error

  return (
    <div className="max-w-2xl bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm space-y-3">
      <div className={`text-sm leading-relaxed prose prose-sm max-w-none ${isError ? 'text-red-600' : 'text-slate-800'}`}>
        <ReactMarkdown>{msg.text}</ReactMarkdown>
      </div>

      {/* Toggles */}
      {(hasQuery || hasResults) && (
        <div className="flex gap-2 pt-1 border-t border-slate-100">
          {hasQuery && (
            <button
              onClick={() => setShowQuery(v => !v)}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              {showQuery ? 'Hide query' : 'Show query'}
            </button>
          )}
          {hasResults && (
            <button
              onClick={() => setShowResults(v => !v)}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M10 4v16M14 4v16" />
              </svg>
              {showResults ? 'Hide data' : `Show data (${msg.response!.results!.row_count} rows)`}
            </button>
          )}
        </div>
      )}

      {showQuery && msg.response?.generated_query && (
        <pre className="text-xs bg-slate-900 text-slate-100 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
          {msg.response.generated_query}
        </pre>
      )}

      {showResults && msg.response?.results && (
        <ResultTable result={msg.response.results} />
      )}
    </div>
  )
}
