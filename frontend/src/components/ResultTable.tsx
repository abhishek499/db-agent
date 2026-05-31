import type { QueryResult } from '../types'

const MAX_DISPLAY = 50

interface Props {
  result: QueryResult
}

export default function ResultTable({ result }: Props) {
  if (result.row_count === 0) {
    return (
      <p className="text-sm text-slate-400 italic py-2">No rows returned.</p>
    )
  }

  const rows = result.rows.slice(0, MAX_DISPLAY)

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-xs">
          <thead className="bg-slate-50">
            <tr>
              {result.columns.map(col => (
                <th
                  key={col}
                  className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {rows.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 1 ? 'bg-slate-50/50' : ''}>
                {row.map((cell, ci) => (
                  <td key={ci} className="px-3 py-2 text-slate-800 max-w-xs truncate">
                    {cell === null || cell === undefined ? (
                      <span className="text-slate-300 italic">null</span>
                    ) : (
                      String(cell)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {result.row_count > MAX_DISPLAY && (
        <p className="text-xs text-slate-400 mt-1.5">
          Showing {MAX_DISPLAY} of {result.row_count} rows
        </p>
      )}
    </div>
  )
}
