import { useState } from 'react'
import type { SchemaResponse } from '../../types'

interface Props {
  schema: SchemaResponse
  onBack: () => void
  onNext: () => void
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

export default function StepSchema({ schema, onBack, onNext }: Props) {
  const [openTables, setOpenTables] = useState<Set<string>>(
    () => new Set(schema.tables.map(t => t.name))
  )

  function toggleTable(name: string) {
    setOpenTables(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  function expandAll() {
    setOpenTables(new Set(schema.tables.map(t => t.name)))
  }

  function collapseAll() {
    setOpenTables(new Set())
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Schema overview</h2>
            <p className="text-slate-500 text-sm mt-1">
              Found <strong>{schema.tables.length}</strong> table(s) and{' '}
              <strong>{schema.relationships.length}</strong> detected relationship(s). Review before continuing.
            </p>
          </div>
          <div className="flex gap-2 shrink-0 pt-0.5">
            <button
              onClick={expandAll}
              className="text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2 transition-colors"
            >
              Expand all
            </button>
            <span className="text-slate-300 text-xs">|</span>
            <button
              onClick={collapseAll}
              className="text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2 transition-colors"
            >
              Collapse all
            </button>
          </div>
        </div>

        {/* Tables — accordion */}
        <div className="space-y-2">
          {schema.tables.map(table => {
            const isOpen = openTables.has(table.name)
            return (
              <div key={table.name} className="border border-slate-200 rounded-lg overflow-hidden">
                {/* Accordion header */}
                <button
                  type="button"
                  onClick={() => toggleTable(table.name)}
                  className="w-full bg-slate-50 hover:bg-slate-100 px-4 py-2.5 flex items-center gap-2 transition-colors"
                >
                  <ChevronIcon open={isOpen} />
                  <span className="font-semibold text-slate-800 text-sm">{table.name}</span>
                  <span className="text-xs text-slate-400 ml-1">{table.columns.length} columns</span>
                </button>

                {/* Accordion body */}
                {isOpen && (
                  <div className="divide-y divide-slate-50 border-t border-slate-100">
                    {table.columns.map(col => (
                      <div key={col.name} className="px-4 py-2 flex items-center gap-3 text-sm">
                        <span className="font-mono text-slate-700 flex-1 min-w-0 truncate">{col.name}</span>
                        <span className="text-xs text-slate-400 font-mono shrink-0">{col.db_type}</span>
                        <div className="flex gap-1 shrink-0">
                          {col.is_primary_key && (
                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">PK</span>
                          )}
                          {col.is_foreign_key && (
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">FK</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Detected relationships */}
        {schema.relationships.length > 0 && (
          <div className="mt-5">
            <p className="text-sm font-medium text-slate-600 mb-2">Auto-detected FK relationships</p>
            <div className="space-y-1.5">
              {schema.relationships.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-xs bg-blue-50 px-3 py-2 rounded-lg font-mono text-blue-800">
                  <span>{r.from_table}.{r.from_column}</span>
                  <span className="text-blue-400">--&gt;</span>
                  <span>{r.to_table}.{r.to_column}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50 transition-colors">
          Back
        </button>
        <button onClick={onNext} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors">
          Looks good, continue
        </button>
      </div>
    </div>
  )
}
