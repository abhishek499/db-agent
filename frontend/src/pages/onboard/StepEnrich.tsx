import { useState } from 'react'
import { enrichSchema } from '../../api'
import type { SchemaResponse } from '../../types'

interface Meta { label: string; description: string }

interface Props {
  draftId: string
  schema: SchemaResponse
  onBack: () => void
  onNext: () => void
}

export default function StepEnrich({ draftId, schema, onBack, onNext }: Props) {
  const [tableMeta, setTableMeta] = useState<Record<string, Meta>>(
    Object.fromEntries(schema.tables.map(t => [t.name, { label: '', description: '' }]))
  )
  const [colMeta, setColMeta] = useState<Record<string, Record<string, Meta>>>(
    Object.fromEntries(schema.tables.map(t => [
      t.name,
      Object.fromEntries(t.columns.map(c => [c.name, { label: '', description: '' }])),
    ]))
  )
  const [open, setOpen] = useState<string | null>(schema.tables[0]?.name ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function setTField(table: string, field: keyof Meta, val: string) {
    setTableMeta(prev => ({ ...prev, [table]: { ...prev[table], [field]: val } }))
  }

  function setCField(table: string, col: string, field: keyof Meta, val: string) {
    setColMeta(prev => ({
      ...prev,
      [table]: { ...prev[table], [col]: { ...prev[table][col], [field]: val } },
    }))
  }

  async function handleNext() {
    setLoading(true); setError('')
    try {
      const tables = Object.entries(tableMeta)
        .filter(([, v]) => v.label || v.description)
        .map(([table_name, v]) => ({ table_name, ...v }))

      const columns = Object.entries(colMeta).flatMap(([table_name, cols]) =>
        Object.entries(cols)
          .filter(([, v]) => v.label || v.description)
          .map(([column_name, v]) => ({ table_name, column_name, ...v }))
      )

      await enrichSchema(draftId, tables, columns)
      onNext()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900">Add business context</h2>
        <p className="text-slate-500 text-sm mt-1 mb-5">
          Label each table and column with plain-English descriptions. All fields are optional
          but directly improve AI query quality.
        </p>

        <div className="space-y-2">
          {schema.tables.map(table => (
            <div key={table.name} className="border border-slate-200 rounded-lg overflow-hidden">
              {/* Accordion toggle */}
              <button
                onClick={() => setOpen(open === table.name ? null : table.name)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
              >
                <span className="font-medium text-slate-800 text-sm">{table.name}</span>
                <svg
                  className={`w-4 h-4 text-slate-400 transition-transform ${open === table.name ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {open === table.name && (
                <div className="p-4 space-y-4 border-t border-slate-100">
                  {/* Table meta */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Table label</label>
                      <input
                        value={tableMeta[table.name]?.label ?? ''}
                        onChange={e => setTField(table.name, 'label', e.target.value)}
                        placeholder='e.g. "Customer Orders"'
                        className="w-full border border-slate-200 rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
                      <input
                        value={tableMeta[table.name]?.description ?? ''}
                        onChange={e => setTField(table.name, 'description', e.target.value)}
                        placeholder="What does this table store?"
                        className="w-full border border-slate-200 rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                    </div>
                  </div>

                  {/* Columns */}
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Columns</p>
                    <div className="space-y-2">
                      {table.columns.map(col => (
                        <div key={col.name} className="grid grid-cols-3 gap-2 items-center">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-mono text-slate-700 truncate">{col.name}</span>
                            {col.is_primary_key && <span className="shrink-0 px-1 bg-amber-100 text-amber-700 rounded text-xs">PK</span>}
                            {col.is_foreign_key && <span className="shrink-0 px-1 bg-blue-100 text-blue-700 rounded text-xs">FK</span>}
                          </div>
                          <input
                            value={colMeta[table.name]?.[col.name]?.label ?? ''}
                            onChange={e => setCField(table.name, col.name, 'label', e.target.value)}
                            placeholder="Label"
                            className="border border-slate-200 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          />
                          <input
                            value={colMeta[table.name]?.[col.name]?.description ?? ''}
                            onChange={e => setCField(table.name, col.name, 'description', e.target.value)}
                            placeholder="What does this mean?"
                            className="border border-slate-200 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
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
