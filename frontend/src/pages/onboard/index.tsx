import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Stepper from '../../components/Stepper'
import StepConnect from './StepConnect'
import StepSchema from './StepSchema'
import StepRelationships from './StepRelationships'
import StepEnrich from './StepEnrich'
import StepFinalize from './StepFinalize'
import type { RelationshipInfo, SchemaResponse } from '../../types'

const STEPS = ['Connect', 'Schema', 'Relationships', 'Enrich', 'Finalize']

export default function Onboard() {
  const navigate = useNavigate()
  const [step,          setStep]          = useState(0)
  const [draftId,       setDraftId]       = useState('')
  const [schema,        setSchema]        = useState<SchemaResponse | null>(null)
  const [relationships, setRelationships] = useState<RelationshipInfo[]>([])

  function handleConnected(id: string, s: SchemaResponse) {
    setDraftId(id)
    setSchema(s)
    setRelationships(s.relationships)
    setStep(1)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 text-sm transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-base font-semibold text-slate-900">New Agent</h1>
          <div className="w-16" />
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 pt-8 pb-16">
        <Stepper steps={STEPS} current={step} />

        {step === 0 && (
          <StepConnect onDone={handleConnected} />
        )}
        {step === 1 && schema && (
          <StepSchema
            schema={schema}
            onBack={() => setStep(0)}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && schema && (
          <StepRelationships
            draftId={draftId}
            schema={schema}
            initial={relationships}
            onBack={() => setStep(1)}
            onNext={rels => { setRelationships(rels); setStep(3) }}
          />
        )}
        {step === 3 && schema && (
          <StepEnrich
            draftId={draftId}
            schema={schema}
            onBack={() => setStep(2)}
            onNext={() => setStep(4)}
          />
        )}
        {step === 4 && (
          <StepFinalize
            draftId={draftId}
            onBack={() => setStep(3)}
          />
        )}
      </div>
    </div>
  )
}
