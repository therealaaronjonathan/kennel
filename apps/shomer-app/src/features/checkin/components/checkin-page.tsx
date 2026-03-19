import { useState } from 'react'
import { AlertCircle, PawPrint, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useClinic } from '@/features/clinic'
import { useDutyRoster } from '@/features/settings/services/use-duty-roster'
import { PetSearchStep } from './pet-search-step'
import { RegisterOwnerStep } from './register-owner-step'
import { CheckinFormStep } from './checkin-form-step'
import { ConfirmationStep } from './confirmation-step'
import { checkinExistingOwner, registerAndCheckin } from '../services/checkin-service'
import type {
  PetOwner,
  Pet,
  PetWithOwner,
  NewOwnerFormData,
  CheckinFormData,
  CheckinResult,
} from '../types'
import type { SpeciesFilter } from '../services/use-pet-search'

type FlowStep =
  | { type: 'search' }
  | { type: 'pet-results'; results: PetWithOwner[]; petName: string; breed: string }
  | { type: 'found'; owner: PetOwner; pets: Pet[]; selectedPetId: string }
  | { type: 'register'; prefillPetName: string; prefillBreed: string; prefillSpecies: SpeciesFilter }
  | {
      type: 'checkin-form'
      owner: PetOwner | null
      pets: Pet[]
      selectedPetId: string
      newOwnerData: NewOwnerFormData | null
    }
  | { type: 'confirmation'; result: CheckinResult }

const STEP_LABELS: Record<string, string> = {
  search: 'Step 1 — Find Pet',
  'pet-results': 'Step 1 — Results',
  found: 'Step 1 — Pet Found',
  register: 'Step 1 — New Patient',
  'checkin-form': 'Step 2 — Check-in Details',
  confirmation: 'Check-in Complete',
}

export function CheckinPage() {
  const navigate = useNavigate()
  const { clinicId, branchId, loading: clinicLoading, error: clinicError } = useClinic()
  const { onDuty, loading: rosterLoading } = useDutyRoster(clinicId, branchId)
  const [step, setStep] = useState<FlowStep>({ type: 'search' })

  const existingCheckin = useMutation({
    mutationFn: ({
      owner,
      petName,
      formData,
      doctorName,
    }: {
      owner: PetOwner
      petName: string
      formData: CheckinFormData
      doctorName: string
    }) => checkinExistingOwner(clinicId!, branchId!, owner, petName, formData, doctorName),
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
      const pet = step.pets.find((p) => p.id === formData.petId) ?? step.pets[0]
      const petName = pet?.name ?? ''
      existingCheckin.mutate({ owner: step.owner, petName, formData, doctorName })
    } else if (step.newOwnerData) {
      newCheckin.mutate({ newOwner: step.newOwnerData, formData, doctorName })
    }
  }

  function reset() {
    existingCheckin.reset()
    newCheckin.reset()
    setStep({ type: 'search' })
  }

  if (clinicLoading || rosterLoading) {
    return (
      <div className="flex items-center justify-center flex-1 h-full">
        <p className="text-[13px] text-muted">Loading…</p>
      </div>
    )
  }

  if (clinicError || !clinicId || !branchId) {
    return (
      <div className="flex items-center justify-center flex-1 h-full">
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
    <div className="flex flex-col h-full overflow-y-auto bg-background">
      {/* Top bar */}
      <header className="h-[52px] border-b border-border-base bg-surface flex items-center px-6 flex-shrink-0">
        <h1 className="font-display text-[18px] font-bold text-foreground leading-none">
          Check-in
        </h1>
      </header>

      <main className="mx-auto max-w-xl w-full px-6 py-8 animate-fade-up">
        {/* No doctors on duty warning */}
        {onDuty.length === 0 && step.type !== 'confirmation' && (
          <div className="mb-6 flex items-start gap-3 rounded-[4px] border border-warning/30 bg-warning/5 px-4 py-3">
            <AlertCircle size={15} className="text-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-semibold text-foreground">No doctors on duty</p>
              <p className="text-[12px] text-muted mt-0.5">
                Go to{' '}
                <button
                  type="button"
                  onClick={() => navigate('/reception/settings')}
                  className="text-primary font-semibold hover:underline"
                >
                  Settings
                </button>{' '}
                to mark doctors on duty before checking in patients.
              </p>
            </div>
          </div>
        )}

        {/* Step indicator */}
        <div className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
            {STEP_LABELS[step.type] ?? ''}
          </p>
          {step.type !== 'confirmation' && (
            <div className="mt-2 flex gap-1.5">
              {[0, 1].map((i) => {
                const active =
                  (i === 0 && ['search', 'pet-results', 'found', 'register'].includes(step.type)) ||
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

        {/* Step: search */}
        {step.type === 'search' && (
          <PetSearchStep
            clinicId={clinicId}
            onFound={({ pet, owner }) => {
              setStep({ type: 'found', owner, pets: [pet], selectedPetId: pet.id })
            }}
            onNotFound={(petName, breed, species) =>
              setStep({ type: 'register', prefillPetName: petName, prefillBreed: breed, prefillSpecies: species })
            }
          />
        )}

        {/* Step: found */}
        {step.type === 'found' && (
          <div className="space-y-4">
            <div className="rounded-[4px] border border-border-active bg-surface-2 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-[4px] bg-primary/10 flex-shrink-0">
                  <PawPrint size={13} className="text-primary" />
                </div>
                <div>
                  {(() => {
                    const pet = step.pets.find((p) => p.id === step.selectedPetId) ?? step.pets[0]
                    return (
                      <>
                        <p className="text-[13px] font-semibold text-foreground">{pet.name}</p>
                        <p className="text-[11px] text-muted capitalize">
                          {pet.species}{pet.breed ? ` · ${pet.breed}` : ''}
                        </p>
                      </>
                    )
                  })()}
                </div>
              </div>
              <div className="flex items-center gap-1.5 pl-9">
                <User size={11} className="text-muted flex-shrink-0" />
                <span className="text-[12px] text-muted">
                  {step.owner.name} · {step.owner.phone}
                  {step.owner.email ? ` · ${step.owner.email}` : ''}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setStep({
                  type: 'checkin-form',
                  owner: step.owner,
                  pets: step.pets,
                  selectedPetId: step.selectedPetId,
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
              Not the right pet? Search again
            </button>
          </div>
        )}

        {/* Step: register */}
        {step.type === 'register' && (
          <RegisterOwnerStep
            prefillPetName={step.prefillPetName}
            prefillBreed={step.prefillBreed}
            prefillSpecies={step.prefillSpecies}
            onBack={reset}
            onSubmit={(data) =>
              setStep({
                type: 'checkin-form',
                owner: null,
                pets: [],
                selectedPetId: '',
                newOwnerData: data,
              })
            }
          />
        )}

        {/* Step: checkin-form */}
        {step.type === 'checkin-form' && (
          <>
            <CheckinFormStep
              clinicId={clinicId}
              branchId={branchId}
              pets={step.pets}
              isNewOwner={step.owner === null}
              selectedPetId={step.selectedPetId}
              onDutyIds={onDuty}
              onSubmit={handleCheckinFormSubmit}
              onBack={() =>
                step.owner
                  ? setStep({
                      type: 'found',
                      owner: step.owner,
                      pets: step.pets,
                      selectedPetId: step.selectedPetId,
                    })
                  : setStep({ type: 'search' })
              }
              isSubmitting={isSubmitting}
            />
            {submitError && (
              <p className="mt-3 text-[12px] text-danger text-center">{submitError}</p>
            )}
          </>
        )}

        {/* Step: confirmation */}
        {step.type === 'confirmation' && (
          <ConfirmationStep result={step.result} onNewCheckin={reset} />
        )}
      </main>
    </div>
  )
}
