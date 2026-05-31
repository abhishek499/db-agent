import { useState } from 'react'
import { setRelationships } from '../../api'
import type { RelationshipInfo, SchemaResponse } from '../../types'

interface Props {
  draftId: string
  schema: SchemaResponse
  initial: RelationshipInfo[]
  onBack: () => void
  onNext: (rels: RelationshipInfo[]) => void
}

export default function StepRelationships({ draftId, schema, initial, onBack, onNext }: Props) {
  const [rels, setRels] = useState<RelationshipInfo[]>(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const tableNames = schema.tables.map(t => t.name)
  const colsByTable = Object.fromEntries(schema.tables.map(t => [t.name, t.columns.map(c => c.name)]))

  function update(i: number, patch: Partial<RelationshipInfo>) {
    setRels(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  }

  function add() {
    const first = tableNames[0] ?? ''
    const firstCol = colsByTable[first]?.[0] ?? ''
    setRels(prev => [...prev, {
      from_table: first, from_column: firstCol,
      to_table: first,   to_column: firstCol,
      relationship_type: 'one_to_many',
      description: '',
    }])
  }

  async function handleNext() {
    setLoading(true); setError('')
    try {
      await setRelationships(draftId, rels)
      onNext(rels)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-semibold text-slate-900">Relationships</h2>
          <button onClick={add} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
            + Add
          </button>
        </div>
        <p className="text-slate-500 text-sm mb-5">
          Describe each relationship in plain English — this directly improves the AI's query quality.
        </p>

        {rels.length === 0 && (
          <div className="text-center py-10 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-lg">
            No relationships yet.{' '}
            <button onClick={add} className="text-indigo-500 hover:underline">Add one</button>
            {' '}or continue if your data has no relations.
          </div>
        )}

        <div className="space-y-4">
          {rels.map((rel, i) => (
            <div key={i} className="border border-slate-200 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">From table</label>
                  <select value={rel.from_table}
                    onChange={e => update(i, { from_table: e.target.value, from_column: colsByTable[e.target.value]?.[0] ?? '' })}
                    className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    {tableNames.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">From column</label>
                  <select value={rel.from_column} onChange={e => update(i, { from_column: e.target.value })}
                    className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    {(colsByTable[rel.from_table] ?? []).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">To table</label>
                  <select value={rel.to_table}
                    onChange={e => update(i, { to_table: e.target.value, to_column: colsByTable[e.target.value]?.[0] ?? '' })}
                    className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    {tableNames.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">To column</label>
                  <select value={rel.to_column} onChange={e => update(i, { to_column: e.target.value })}
                    className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    {(colsByTable[rel.to_table] ?? []).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">What does this relationship mean?</label>
                <input value={rel.description ?? ''} onChange={e => update(i, { description: e.target.value })}
                  placeholder="e.g. the customer who placed this order"
                  className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <button onClick={() => setRels(prev => prev.filter((_, idx) => idx !== i))}
                className="text-xs text-red-400 hover:text-red-600">
                Remove
              </button>
            </div>
          ))}
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50 transition-colors">
          Back
        </button>
        <button onClick={handleNext} disabled={loading}
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg text-sm font-medium transition-colors">
          {loading ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </div>
  )
}
