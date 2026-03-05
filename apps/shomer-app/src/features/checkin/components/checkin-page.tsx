import { useState } from 'react'
import { signOut } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { auth } from '@/lib/firebase'
import { useClinic } from '@/features/clinic'
import { OwnerSearchStep } from './owner-search-step'
import { RegisterOwnerStep } from './register-owner-step'
import { CheckinFormStep } from './checkin-form-step'
import { ConfirmationStep } from './confirmation-step'
import { checkinExistingOwner, registerAndCheckin } from '../services/checkin-service'
import type {
  PetOwner,
  Pet,
  NewOwnerFormData,
  CheckinFormData,
  CheckinResult,
} from '../types'

type FlowStep =
  | { type: 'search' }
  | { type: 'found'; owner: PetOwner; pets: Pet[] }
  | { type: 'register'; searchTerm: string }
  | {
      type: 'checkin-form'
      owner: PetOwner | null
      pets: Pet[]
      newOwnerData: NewOwnerFormData | null
    }
  | { type: 'confirmation'; result: CheckinResult }

const STEP_LABELS: Record<string, string> = {
  search: 'Step 1 — Find Owner',
  found: 'Step 1 — Owner Found',
  register: 'Step 1 — New Owner',
  'checkin-form': 'Step 2 — Check-in Details',
  confirmation: 'Check-in Complete',
}

export function CheckinPage() {
  const navigate = useNavigate()
  const { clinicId, branchId, loading: clinicLoading, error: clinicError } = useClinic()
  const [step, setStep] = useState<FlowStep>({ type: 'search' })

  const existingCheckin = useMutation({
    mutationFn: ({
      owner,
      formData,
      doctorName,
    }: {
      owner: PetOwner
      formData: CheckinFormData
      doctorName: string
    }) => checkinExistingOwner(clinicId!, branchId!, owner, formData, doctorName),
    onSuccess: (result) => setStep({ type: 'confirmation', result }),
  })

  const newCheckin = useMutation({
    mutationFn: ({
      newOwner,
      formData,
      doctorName,
    }: {
      newOwner: NewOwnerFormData
      formData: CheckinFormData
      doctorName: string
    }) => registerAndCheckin(clinicId!, branchId!, newOwner, formData, doctorName),
    onSuccess: (result) => setStep({ type: 'confirmation', result }),
  })

  const isSubmitting = existingCheckin.isPending || newCheckin.isPending
  const submitError = existingCheckin.error?.message ?? newCheckin.error?.message

  function handleCheckinFormSubmit(formData: CheckinFormData, doctorName: string) {
    if (step.type !== 'checkin-form') return
    if (step.owner) {
      existingCheckin.mutate({ owner: step.owner, formData, doctorName })
    } else if (step.newOwnerData) {
      newCheckin.mutate({ newOwner: step.newOwnerData, formData, doctorName })
    }
  }

  function reset() {
    existingCheckin.reset()
    newCheckin.reset()
    setStep({ type: 'search' })
  }

  if (clinicLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-[13px] text-muted">Loading…</p>
      </div>
    )
  }

  if (clinicError || !clinicId || !branchId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-[13px] text-danger font-medium">
            {clinicError ?? 'Clinic profile not found.'}
          </p>
          <p className="text-[11px] text-muted">
            Ask your admin to add you as staff in Firestore.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="h-[52px] border-b border-border-base bg-surface flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <img
            src="/logos/shomer-purple-on-light.png"
            alt="Shomer"
            className="h-6 w-auto"
          />
          <span className="text-[13px] text-muted">/ Check-in</span>
        </div>
        <button
          type="button"
          onClick={() => signOut(auth).then(() => navigate('/login'))}
          className="rounded-[4px] border border-border-base px-3 py-1.5 text-[12px] font-semibold text-muted hover:text-foreground hover:border-foreground/20 transition-colors"
        >
          Sign out
        </button>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-xl px-6 py-8">
        {/* Step indicator */}
        <div className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
            {STEP_LABELS[step.type] ?? ''}
          </p>
          {step.type !== 'confirmation' && (
            <div className="mt-2 flex gap-1.5">
              {['search', 'found', 'register', 'checkin-form'].slice(0, 2).map((_, i) => {
                const active =
                  (i === 0 && ['search', 'found', 'register'].includes(step.type)) ||
                  (i === 1 && step.type === 'checkin-form')
                return (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${active ? 'bg-primary' : 'bg-border-base'}`}
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* Steps */}
        {step.type === 'search' && (
          <OwnerSearchStep
            clinicId={clinicId}
            branchId={branchId}
            onFound={(owner, pets) => setStep({ type: 'found', owner, pets })}
            onNotFound={(searchTerm) => setStep({ type: 'register', searchTerm })}
          />
        )}

        {step.type === 'found' && (
          <div className="space-y-4">
            <div className="rounded-[4px] border border-border-active bg-surface-2 p-4">
              <p className="text-[13px] font-semibold text-foreground">
                {step.owner.name}
              </p>
              <p className="text-[11px] text-muted">
                {step.owner.phone}
                {step.owner.email ? ` · ${step.owner.email}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setStep({
                  type: 'checkin-form',
                  owner: step.owner,
                  pets: step.pets,
                  newOwnerData: null,
                })
              }
              className="w-full rounded-[4px] bg-primary px-4 py-[9px] text-[13px] font-semibold text-white hover:opacity-85 transition-opacity"
            >
              Continue to check-in
            </button>
            <button
              type="button"
              onClick={reset}
              className="w-full text-center text-[12px] text-muted hover:text-foreground transition-colors"
            >
              Not the right owner? Search again
            </button>
          </div>
        )}

        {step.type === 'register' && (
          <RegisterOwnerStep
            prefillPhone={step.searchTerm.includes('@') ? '' : step.searchTerm}
            prefillEmail={step.searchTerm.includes('@') ? step.searchTerm : ''}
            onBack={reset}
            onSubmit={(data) =>
              setStep({
                type: 'checkin-form',
                owner: null,
                pets: [],
                newOwnerData: data,
              })
            }
          />
        )}

        {step.type === 'checkin-form' && (
          <>
            <CheckinFormStep
              clinicId={clinicId}
              branchId={branchId}
              pets={step.pets}
              isNewOwner={step.owner === null}
              onSubmit={handleCheckinFormSubmit}
              onBack={() =>
                step.owner
                  ? setStep({ type: 'found', owner: step.owner, pets: step.pets })
                  : setStep({ type: 'search' })
              }
              isSubmitting={isSubmitting}
            />
            {submitError && (
              <p className="mt-3 text-[12px] text-danger text-center">{submitError}</p>
            )}
          </>
        )}

        {step.type === 'confirmation' && (
          <ConfirmationStep result={step.result} onNewCheckin={reset} />
        )}
      </main>
    </div>
  )
}
