import { useState } from 'react'
import { connectDb, getSchema } from '../../api'
import type { SchemaResponse } from '../../types'

const DB_TYPES = [
  { value: 'sqlite',     label: 'SQLite' },
  { value: 'postgresql', label: 'PostgreSQL' },
  { value: 'mysql',      label: 'MySQL' },
  { value: 'mongodb',    label: 'MongoDB' },
]

const URI_PLACEHOLDERS: Record<string, string> = {
  sqlite:     'sqlite:////absolute/path/to/db.db',
  postgresql: 'postgresql://user:pass@localhost:5432/dbname',
  mysql:      'mysql://user:pass@localhost:3306/dbname',
  mongodb:    'mongodb://user:pass@localhost:27017/dbname',
}

interface Props {
  onDone: (draftId: string, schema: SchemaResponse) => void
}

export default function StepConnect({ onDone }: Props) {
  const [dbType, setDbType] = useState('sqlite')
  const [dbUri,  setDbUri]  = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function handleConnect() {
    if (!dbUri.trim()) { setError('Database URI is required'); return }
    setLoading(true)
    setError('')
    try {
      const conn   = await connectDb(dbType, dbUri.trim())
      const schema = await getSchema(conn.draft_id)
      onDone(conn.draft_id, schema)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-8 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Connect your database</h2>
        <p className="text-slate-500 text-sm mt-1">
          Choose your database type and paste your connection URI.
        </p>
      </div>

      {/* DB type picker */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Database type</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {DB_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => { setDbType(t.value); setDbUri('') }}
              className={`py-3 px-4 rounded-lg border text-sm font-medium transition-all ${
                dbType === t.value
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* URI input */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Connection URI</label>
        <input
          type="text"
          value={dbUri}
          onChange={e => setDbUri(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleConnect()}
          placeholder={URI_PLACEHOLDERS[dbType]}
          className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        <p className="text-xs text-slate-400 mt-1">
          The URI is stored only in your local <code>agents/</code> directory.
        </p>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handleConnect}
        disabled={loading}
        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg text-sm font-medium transition-colors"
      >
        {loading ? 'Connecting & scanning schema...' : 'Connect'}
      </button>
    </div>
  )
}
