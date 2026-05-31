import type { SchemaResponse } from '../../types'

interface Props {
  schema: SchemaResponse
  onBack: () => void
  onNext: () => void
}

export default function StepSchema({ schema, onBack, onNext }: Props) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900">Schema overview</h2>
        <p className="text-slate-500 text-sm mt-1 mb-5">
          Found <strong>{schema.tables.length}</strong> table(s) and{' '}
          <strong>{schema.relationships.length}</strong> detected relationship(s). Review before continuing.
        </p>

        {/* Tables */}
        <div className="space-y-3">
          {schema.tables.map(table => (
            <div key={table.name} className="border border-slate-100 rounded-lg overflow-hidden">
              <div className="bg-slate-50 px-4 py-2.5 flex items-center gap-2 border-b border-slate-100">
                <span className="font-semibold text-slate-800 text-sm">{table.name}</span>
                <span className="text-xs text-slate-400">{table.columns.length} columns</span>
              </div>
              <div className="divide-y divide-slate-50">
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
            </div>
          ))}
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
