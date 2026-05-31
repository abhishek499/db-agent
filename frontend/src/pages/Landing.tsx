import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AppLogo from '../components/AppLogo'

// ─── Data ────────────────────────────────────────────────────────────────────

const DB_LOGOS = [
  { src: '/mongodb-original.svg',    name: 'MongoDB',    bg: 'bg-green-50',  border: 'border-green-200' },
  { src: '/postgresql-original.svg', name: 'PostgreSQL', bg: 'bg-blue-50',   border: 'border-blue-200'  },
  { src: '/mysql-original.svg',      name: 'MySQL',      bg: 'bg-amber-50',  border: 'border-amber-200' },
  { src: '/sqlite-original.svg',     name: 'SQLite',     bg: 'bg-sky-50',    border: 'border-sky-200'   },
]

const FEATURES = [
  {
    accent: 'bg-indigo-100 text-indigo-600',
    title: 'Natural Language Queries',
    desc: 'Ask questions in plain English. Claude translates them to SQL or MongoDB queries automatically — no technical knowledge required.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
  },
  {
    accent: 'bg-blue-100 text-blue-600',
    title: 'Any Database',
    desc: 'Supports PostgreSQL, MySQL, SQLite, and MongoDB out of the box. Connect with a single URI — no complex configuration needed.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
      </svg>
    ),
  },
  {
    accent: 'bg-violet-100 text-violet-600',
    title: 'Granular Access Control',
    desc: 'Keep agents private, share with specific users by email, or publish publicly. Full control over who can access what.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    accent: 'bg-amber-100 text-amber-600',
    title: 'Schema Enrichment',
    desc: 'Add plain-English labels and descriptions to tables and columns. Richer context gives Claude a deeper understanding of your data.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    accent: 'bg-emerald-100 text-emerald-600',
    title: 'Per-User Data Scoping',
    desc: 'Build agents that automatically filter rows by the current user. Perfect for SaaS apps where each user should only see their own data.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    accent: 'bg-rose-100 text-rose-600',
    title: 'Read-Only & Secure',
    desc: 'Every query is strictly read-only. Write operations are blocked at the engine level. Your data is never modified or exposed.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
]

const STEPS = [
  {
    n: '01',
    title: 'Connect your database',
    desc: 'Paste a connection URI. DB Agent introspects your schema instantly — tables, columns, types, and relationships.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
      </svg>
    ),
  },
  {
    n: '02',
    title: 'Configure your agent',
    desc: 'Name it, write a system prompt, set access permissions, and enrich the schema with business context.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    n: '03',
    title: 'Chat with your data',
    desc: 'Ask questions in plain English and get instant answers. The generated query and raw results are always one click away.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
  },
]

// ─── Chat mockup ─────────────────────────────────────────────────────────────

function ChatMockup() {
  return (
    <div className="relative">
      <div className="absolute -inset-6 bg-gradient-to-br from-indigo-400/20 to-violet-400/20 rounded-3xl blur-2xl" />
      <div className="relative bg-white rounded-2xl shadow-2xl shadow-slate-900/10 border border-slate-200/80 overflow-hidden">
        {/* Title bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <div className="w-3 h-3 rounded-full bg-emerald-400" />
          </div>
          <div className="flex-1 bg-white border border-slate-200 rounded-md px-3 py-1 text-xs text-slate-400 text-center truncate">
            Analytics Agent · MongoDB · 33 tables
          </div>
        </div>

        {/* Messages */}
        <div className="p-4 space-y-4 min-h-[280px] bg-slate-50/30">
          <div className="flex justify-end">
            <div className="bg-indigo-600 text-white text-sm px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-[240px] shadow-sm shadow-indigo-600/20">
              Show me top 5 customers by revenue this month
            </div>
          </div>

          <div className="flex justify-start gap-2">
            <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
            </div>
            <div className="bg-white border border-slate-200 text-sm px-4 py-3 rounded-2xl rounded-tl-sm max-w-[280px] space-y-2.5 shadow-sm">
              <p className="text-slate-800 leading-relaxed text-xs">Here are the top 5 customers by revenue in May 2026:</p>
              <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden text-xs">
                <table className="w-full">
                  <thead className="bg-slate-100 border-b border-slate-200">
                    <tr>
                      <th className="px-2 py-1.5 text-left text-slate-500 font-semibold">Customer</th>
                      <th className="px-2 py-1.5 text-right text-slate-500 font-semibold">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[['Acme Corp','$24,800'],['TechFlow','$19,200'],['BuildCo','$15,600'],['NovaSys','$12,400'],['DataEdge','$9,900']].map(([n,r]) => (
                      <tr key={n} className="hover:bg-slate-50">
                        <td className="px-2 py-1.5 text-slate-700">{n}</td>
                        <td className="px-2 py-1.5 text-right text-slate-700 font-mono">{r}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-3 pt-0.5 border-t border-slate-100">
                <span className="flex items-center gap-1 text-xs text-indigo-400 font-medium cursor-pointer hover:text-indigo-600 transition-colors">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                  Show query
                </span>
                <span className="flex items-center gap-1 text-xs text-indigo-400 font-medium cursor-pointer hover:text-indigo-600 transition-colors">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M10 4v16M14 4v16" /></svg>
                  5 rows
                </span>
              </div>
            </div>
          </div>

          {/* Input bar */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm mt-4">
            <span className="flex-1 text-xs text-slate-300 select-none">Ask anything about your data…</span>
            <div className="w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Landing() {
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-white">

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/"><AppLogo size={32} textClassName="text-[15px] text-slate-900" /></Link>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-slate-500 hover:text-slate-900 transition-colors font-medium">Features</a>
            <a href="#how-it-works" className="text-sm text-slate-500 hover:text-slate-900 transition-colors font-medium">How it works</a>
          </div>

          <div className="flex items-center gap-2.5">
            {user ? (
              <button onClick={() => navigate('/dashboard')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm shadow-indigo-500/20">
                Dashboard →
              </button>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors px-3 py-2">
                  Sign in
                </Link>
                <Link to="/signup"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm shadow-indigo-500/20">
                  Get started free
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50/80 to-white">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -z-10 top-0 right-0 w-[700px] h-[500px] bg-indigo-100/60 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3" />
        <div className="pointer-events-none absolute -z-10 bottom-0 left-0 w-[500px] h-[400px] bg-violet-100/50 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3" />

        <div className="max-w-6xl mx-auto px-6 pt-20 pb-28">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Copy */}
            <div>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 mb-8 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                Powered by Claude AI
              </span>

              <h1 className="text-5xl lg:text-6xl font-bold text-slate-900 leading-[1.08] tracking-tight mb-6">
                Ask your database<br />
                <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                  anything
                </span>
              </h1>

              <p className="text-xl text-slate-500 leading-relaxed mb-8 max-w-md">
                Connect any database and chat with your data in plain English. No SQL. No dashboards. Just answers.
              </p>

              <div className="flex flex-wrap gap-3 mb-8">
                <button
                  onClick={() => navigate(user ? '/dashboard' : '/signup')}
                  className="group inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-px"
                >
                  {user ? 'Go to dashboard' : 'Get started free'}
                  <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
                <a href="#how-it-works"
                  className="px-6 py-3 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl font-semibold text-sm transition-all hover:bg-slate-50 hover:-translate-y-px shadow-sm">
                  See how it works
                </a>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 text-sm text-slate-400">
                {['No credit card required', 'Read-only queries', 'Your data stays on your server'].map(t => (
                  <span key={t} className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Mockup */}
            <div className="lg:pl-4">
              <ChatMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── Database support ── */}
      <section className="py-16 border-y border-slate-100 bg-slate-50/50">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-center text-xs font-semibold text-slate-400 uppercase tracking-[0.15em] mb-10">
            Works with your database
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {DB_LOGOS.map(({ src, name, bg, border }) => (
              <div key={name}
                className={`${bg} ${border} border rounded-2xl p-6 flex flex-col items-center gap-3 transition-all duration-200 hover:-translate-y-1 hover:shadow-md cursor-default`}>
                <img src={src} alt={name} className="w-14 h-14 object-contain" />
                <span className="font-semibold text-sm text-slate-700">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Everything you need to query smarter</h2>
            <p className="text-lg text-slate-500 max-w-xl mx-auto leading-relaxed">
              DB Agent handles the complexity of AI-powered data access so you can focus on the insights.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(f => (
              <div key={f.title}
                className="group p-6 rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all duration-200 bg-white">
                <div className={`w-10 h-10 ${f.accent} rounded-xl flex items-center justify-center mb-4`}>
                  {f.icon}
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="py-24 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Up and running in minutes</h2>
            <p className="text-lg text-slate-500">Three steps from connection string to conversational data access.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 relative">
            {/* Connector */}
            <div className="hidden md:block absolute top-10 left-[calc(33%+1rem)] right-[calc(33%+1rem)] h-px bg-gradient-to-r from-indigo-200 via-indigo-300 to-indigo-200" />

            {STEPS.map(s => (
              <div key={s.n}
                className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-indigo-200 hover:shadow-md transition-all duration-200">
                <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-bold text-sm mb-5 shadow-md shadow-indigo-500/20">
                  {s.n}
                </div>
                <div className="text-indigo-500 mb-3">{s.icon}</div>
                <h3 className="font-semibold text-slate-900 mb-2">{s.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="relative bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-12 text-center shadow-2xl shadow-indigo-500/25 overflow-hidden">
            <div className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-2xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
            <div className="relative">
              <h2 className="text-3xl font-bold text-white mb-4">Ready to talk to your data?</h2>
              <p className="text-indigo-200 text-lg mb-8 max-w-sm mx-auto leading-relaxed">
                Connect your first database in under 5 minutes. No SQL expertise required.
              </p>
              <button
                onClick={() => navigate(user ? '/dashboard' : '/signup')}
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-indigo-700 hover:bg-indigo-50 rounded-xl font-bold transition-all hover:-translate-y-px shadow-lg">
                {user ? 'Go to dashboard' : 'Create your free account'}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-100 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <AppLogo size={28} textClassName="text-sm text-slate-700" />
          <p className="text-sm text-slate-400">Natural language queries for any database · Powered by Claude AI</p>
        </div>
      </footer>
    </div>
  )
}
