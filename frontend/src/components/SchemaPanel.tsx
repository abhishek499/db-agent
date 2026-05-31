import { useEffect, useState } from 'react'
import { getAgentSchema } from '../api'
import type { SchemaResponse, TableInfo } from '../types'

interface Props {
  agentId: string
  onClose: () => void
}

export default function SchemaPanel({ agentId, onClose }: Props) {
  const [schema, setSchema] = useState<SchemaResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openTable, setOpenTable] = useState<string | null>(null)

  useEffect(() => {
    getAgentSchema(agentId)
      .then(s => { setSchema(s); setOpenTable(s.tables[0]?.name ?? null) })
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [agentId])

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-80 bg-white border-l border-slate-200 shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 shrink-0">
          <h2 className="font-semibold text-slate-900 text-sm">Schema</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {error && <p className="px-4 py-6 text-sm text-red-600">{error}</p>}

          {schema && (
            <div className="divide-y divide-slate-100">
              {schema.tables.map(table => (
                <TableRow
                  key={table.name}
                  table={table}
                  open={openTable === table.name}
                  onToggle={() => setOpenTable(openTable === table.name ? null : table.name)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Relationships footer */}
        {schema && schema.relationships.length > 0 && (
          <div className="border-t border-slate-200 px-4 py-3 shrink-0 bg-slate-50">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Relationships
            </p>
            <div className="space-y-1">
              {schema.relationships.map((r, i) => (
                <p key={i} className="text-xs text-slate-600 font-mono">
                  {r.from_table}.{r.from_column}
                  <span className="text-slate-400 mx-1">→</span>
                  {r.to_table}.{r.to_column}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function TableRow({ table, open, onToggle }: { table: TableInfo; open: boolean; onToggle: () => void }) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="min-w-0">
          <span className="text-sm font-medium text-slate-800 truncate block">{table.name}</span>
          {table.label && <span className="text-xs text-slate-400 truncate block">{table.label}</span>}
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className="text-xs text-slate-400">{table.columns.length} cols</span>
          <svg
            className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="bg-slate-50 border-t border-slate-100 px-4 py-2 space-y-1.5">
          {table.columns.map(col => (
            <div key={col.name} className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-700 truncate flex-1">{col.name}</span>
              <span className="text-xs text-slate-400 shrink-0">{col.db_type}</span>
              {col.is_primary_key && <span className="text-xs px-1 bg-amber-100 text-amber-700 rounded shrink-0">PK</span>}
              {col.is_foreign_key && <span className="text-xs px-1 bg-blue-100 text-blue-700 rounded shrink-0">FK</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
