interface Props {
  steps: string[]
  current: number
}

export default function Stepper({ steps, current }: Props) {
  return (
    <nav aria-label="Progress" className="mb-8">
      <ol className="flex items-center">
        {steps.map((label, i) => {
          const done    = i < current
          const active  = i === current
          const last    = i === steps.length - 1

          return (
            <li key={label} className={`flex items-center ${last ? '' : 'flex-1'}`}>
              {/* Circle */}
              <span className="flex items-center gap-2">
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                    done
                      ? 'bg-indigo-600 text-white'
                      : active
                      ? 'border-2 border-indigo-600 text-indigo-600 bg-white'
                      : 'border-2 border-slate-300 text-slate-400 bg-white'
                  }`}
                >
                  {done ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                <span
                  className={`text-sm font-medium hidden sm:block ${
                    active ? 'text-indigo-600' : done ? 'text-slate-700' : 'text-slate-400'
                  }`}
                >
                  {label}
                </span>
              </span>

              {/* Connector */}
              {!last && (
                <div className={`flex-1 h-0.5 mx-3 ${done ? 'bg-indigo-600' : 'bg-slate-200'}`} />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
