import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// ─── Database logos as inline SVG ──────────────────────────────────────────

function MongoDBLogo() {
  return (
    <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none">
      <path d="M24 4C24 4 15 16 15 26C15 32.627 18.686 38 24 40C29.314 38 33 32.627 33 26C33 16 24 4 24 4Z" fill="#47A248"/>
      <path d="M24 40L24 44" stroke="#47A248" strokeWidth="3" strokeLinecap="round"/>
      <ellipse cx="24" cy="26" rx="3" ry="4" fill="#B8F0B2" opacity="0.5"/>
    </svg>
  )
}

function PostgreSQLLogo() {
  return (
    <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none">
      <ellipse cx="24" cy="14" rx="12" ry="8" fill="#336791"/>
      <rect x="12" y="14" width="3" height="16" rx="1.5" fill="#336791"/>
      <rect x="33" y="14" width="3" height="12" rx="1.5" fill="#336791"/>
      <path d="M15 30 Q24 36 33 26" stroke="#336791" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <ellipse cx="24" cy="14" rx="10" ry="6" fill="#5B9BD5"/>
      <circle cx="20" cy="12" r="1.5" fill="white" opacity="0.6"/>
    </svg>
  )
}

function MySQLLogo() {
  return (
    <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none">
      <path d="M6 32 L6 16 L10 16 L16 26 L22 16 L26 16 L26 32 L22 32 L22 22 L16 32 L10 22 L10 32 Z" fill="#00758F"/>
      <path d="M30 16 L30 32 L34 32 L34 24 L42 32 L42 16 L38 16 L38 24 L30 16 Z" fill="#F29111"/>
      <path d="M6 36 Q24 44 42 36" stroke="#F29111" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6"/>
    </svg>
  )
}

function SQLiteLogo() {
  return (
    <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none">
      <ellipse cx="24" cy="12" rx="14" ry="6" fill="#044A64"/>
      <rect x="10" y="12" width="28" height="20" fill="#0D6A8B"/>
      <ellipse cx="24" cy="32" rx="14" ry="6" fill="#044A64"/>
      <ellipse cx="24" cy="12" rx="12" ry="4" fill="#1590BB" opacity="0.7"/>
      <ellipse cx="24" cy="22" rx="12" ry="4" fill="#1590BB" opacity="0.4"/>
    </svg>
  )
}

// ─── Feature icons ──────────────────────────────────────────────────────────

const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
    title: 'Natural Language Queries',
    desc: 'Ask questions in plain English. The AI translates them to SQL or MongoDB queries automatically — no technical knowledge needed.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
      </svg>
    ),
    title: 'Any Database',
    desc: 'Works with PostgreSQL, MySQL, SQLite, and MongoDB out of the box. Connect with a single URI — no complex configuration.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: 'Granular Access Control',
    desc: 'Keep agents private, share them with specific users by email, or publish them publicly. Full control over who sees what.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    title: 'Schema Enrichment',
    desc: 'Add plain-English labels and descriptions to tables and columns. The richer the context, the smarter the queries.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    title: 'Per-User Data Scoping',
    desc: 'Build agents that filter data by user ID automatically. Perfect for SaaS apps where each user should only see their own records.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: 'Read-Only & Secure',
    desc: 'All queries are strictly read-only. Write operations are blocked at the engine level. Your data is never modified.',
  },
]

const steps = [
  {
    n: '01',
    title: 'Connect your database',
    desc: 'Paste your connection URI. We introspect the schema instantly — tables, columns, types, and relationships.',
  },
  {
    n: '02',
    title: 'Configure your agent',
    desc: 'Name it, write a system prompt for its personality, set access permissions, and enrich the schema with business context.',
  },
  {
    n: '03',
    title: 'Chat with your data',
    desc: 'Ask questions in plain English and get instant answers with the underlying query and raw data always one click away.',
  },
]

// ─── Chat preview mockup ────────────────────────────────────────────────────

function ChatMockup() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 bg-indigo-600/10 rounded-3xl blur-2xl" />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Title bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 bg-white rounded-md border border-slate-200 px-3 py-1 text-xs text-slate-400 text-center">
            Analytics Agent · mongodb · 33 tables
          </div>
        </div>
        {/* Messages */}
        <div className="p-4 space-y-4 min-h-[260px]">
          <div className="flex justify-end">
            <div className="bg-indigo-600 text-white text-sm px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-[240px]">
              Show me top 5 customers by revenue this month
            </div>
          </div>
          <div className="flex justify-start">
            <div className="bg-slate-50 border border-slate-200 text-sm px-4 py-3 rounded-2xl rounded-tl-sm max-w-[280px] space-y-2">
              <p className="text-slate-800 leading-relaxed">Here are the top 5 customers by revenue in May 2026:</p>
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden text-xs">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-2 py-1.5 text-left text-slate-500 font-medium">Customer</th>
                      <th className="px-2 py-1.5 text-right text-slate-500 font-medium">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[['Acme Corp', '$24,800'],['TechFlow', '$19,200'],['BuildCo', '$15,600'],['NovaSys', '$12,400'],['DataEdge', '$9,900']].map(([name, rev]) => (
                      <tr key={name}>
                        <td className="px-2 py-1.5 text-slate-700">{name}</td>
                        <td className="px-2 py-1.5 text-right text-slate-700 font-mono">{rev}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-3 pt-1 border-t border-slate-100">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                  Show query
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M10 4v16M14 4v16" /></svg>
                  Show data (5 rows)
                </span>
              </div>
            </div>
          </div>
          {/* Input bar */}
          <div className="mt-auto pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <span className="flex-1 text-xs text-slate-400">Ask anything about your data…</span>
              <div className="w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function Landing() {
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-white w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
            </div>
            <span className="font-semibold text-slate-900">DB Agent</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">How it works</a>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <button onClick={() => navigate('/dashboard')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors">
                Go to dashboard →
              </button>
            ) : (
              <>
                <Link to="/login" className="text-sm text-slate-600 hover:text-slate-900 transition-colors font-medium">
                  Sign in
                </Link>
                <Link to="/signup"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors">
                  Get started free
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-slate-50" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-400/10 rounded-full blur-3xl" />
        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-full text-xs font-medium text-indigo-700 mb-6">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                Powered by Claude AI
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 leading-tight tracking-tight mb-5">
                Ask your database<br />
                <span className="text-indigo-600">anything</span>, in plain English
              </h1>
              <p className="text-lg text-slate-600 leading-relaxed mb-8 max-w-lg">
                Connect your database, configure an AI agent, and start getting instant answers — no SQL required.
                Works with MongoDB, PostgreSQL, MySQL, and SQLite.
              </p>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => navigate(user ? '/dashboard' : '/signup')}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-indigo-500/20">
                  {user ? 'Go to dashboard →' : 'Start for free →'}
                </button>
                <a href="#how-it-works"
                  className="px-6 py-3 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 rounded-xl font-medium transition-colors">
                  See how it works
                </a>
              </div>
              <p className="text-xs text-slate-400 mt-4">No credit card required · Your DB credentials never leave your server</p>
            </div>
            <div className="lg:pl-4">
              <ChatMockup />
            </div>
          </div>
        </div>
      </section>

      {/* Database logos */}
      <section className="border-y border-slate-100 bg-slate-50 py-12">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-center text-sm font-medium text-slate-500 uppercase tracking-widest mb-10">
            Works with your favorite databases
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { Logo: MongoDBLogo, name: 'MongoDB',    color: 'bg-green-50  border-green-200',  text: 'text-green-800'  },
              { Logo: PostgreSQLLogo, name: 'PostgreSQL', color: 'bg-blue-50   border-blue-200',   text: 'text-blue-800'   },
              { Logo: MySQLLogo,    name: 'MySQL',      color: 'bg-orange-50 border-orange-200', text: 'text-orange-800' },
              { Logo: SQLiteLogo,   name: 'SQLite',     color: 'bg-teal-50   border-teal-200',   text: 'text-teal-800'   },
            ].map(({ Logo, name, color, text }) => (
              <div key={name} className={`flex flex-col items-center gap-3 p-6 rounded-2xl border ${color} transition-transform hover:-translate-y-0.5`}>
                <Logo />
                <span className={`font-semibold text-sm ${text}`}>{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Everything you need to query smarter</h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              DB Agent handles the complexity of AI-powered data access so you can focus on the insights.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(f => (
              <div key={f.title} className="p-6 rounded-2xl border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all group">
                <div className="w-11 h-11 bg-indigo-50 group-hover:bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 mb-4 transition-colors">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 bg-slate-50">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Up and running in minutes</h2>
            <p className="text-slate-500">Three steps from connection string to conversational data access.</p>
          </div>
          <div className="space-y-6">
            {steps.map((s, i) => (
              <div key={s.n} className="flex gap-6 p-6 bg-white rounded-2xl border border-slate-200 hover:border-indigo-200 hover:shadow-sm transition-all">
                <div className="shrink-0 w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-bold text-sm">
                  {s.n}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">{s.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className="absolute left-[2.25rem] mt-[4.5rem] w-0.5 h-6 bg-slate-200" style={{ position: 'relative', display: 'none' }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <div className="bg-indigo-600 rounded-3xl p-12 shadow-2xl shadow-indigo-500/20">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to talk to your data?</h2>
            <p className="text-indigo-200 mb-8 leading-relaxed">
              Join developers and analysts who query their databases with plain English.
              Connect your first database in under 2 minutes.
            </p>
            <button onClick={() => navigate(user ? '/dashboard' : '/signup')}
              className="px-8 py-3.5 bg-white text-indigo-600 hover:bg-indigo-50 rounded-xl font-semibold transition-colors shadow-lg">
              {user ? 'Go to dashboard' : 'Create your free account'}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-slate-700">DB Agent</span>
          </div>
          <p className="text-xs text-slate-400">Natural language queries for any database · Powered by Claude AI</p>
        </div>
      </footer>
    </div>
  )
}
