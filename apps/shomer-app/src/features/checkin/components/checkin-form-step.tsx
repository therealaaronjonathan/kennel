import { useState } from 'react'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ComplaintsSelect } from './complaints-select'
import { useDoctors } from '../services/use-doctors'
import type { Pet, CheckinFormData } from '../types'

interface CheckinFormStepProps {
  clinicId: string
  branchId: string
  pets: Pet[]            // empty if new owner (pet already captured in registration)
  isNewOwner: boolean
  onSubmit: (data: CheckinFormData, doctorName: string) => void
  onBack: () => void
  isSubmitting: boolean
}

export function CheckinFormStep({
  clinicId,
  branchId,
  pets,
  isNewOwner,
  onSubmit,
  onBack,
  isSubmitting,
}: CheckinFormStepProps) {
  const { data: doctors = [], isLoading: doctorsLoading } = useDoctors(clinicId, branchId)

  const [petId, setPetId] = useState(pets.length === 1 ? pets[0].id : '')
  const [complaints, setComplaints] = useState<string[]>([])
  const [doctorId, setDoctorId] = useState('')
  const [isEmergency, setIsEmergency] = useState(false)
  const [errors, setErrors] = useState<{ pet?: string; complaints?: string; doctor?: string }>({})

  function validate(): boolean {
    const next: typeof errors = {}
    if (!isNewOwner && pets.length > 1 && !petId) next.pet = 'Select a pet'
    if (complaints.length === 0) next.complaints = 'Select at least one complaint'
    if (!doctorId) next.doctor = 'Select a doctor'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    const selectedPetId = isNewOwner ? '' : (pets.length === 1 ? pets[0].id : petId)
    const doctor = doctors.find((d) => d.id === doctorId)
    onSubmit(
      { petId: selectedPetId, complaints, doctorId, isEmergency },
      doctor?.name ?? '',
    )
  }

  const showPetSelector = !isNewOwner && pets.length > 1

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} />
        Back
      </button>

      {/* Pet selector — only for existing owners with multiple pets */}
      {showPetSelector && (
        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
            Select Pet <span className="text-danger">*</span>
          </label>
          <select
            value={petId}
            onChange={(e) => {
              setPetId(e.target.value)
              setErrors((p) => ({ ...p, pet: undefined }))
            }}
            className={cn(
              'w-full rounded-[4px] border bg-white px-3 py-[9px] text-[13px] font-medium text-foreground focus:border-primary focus:outline-none transition-colors',
              errors.pet ? 'border-danger' : 'border-border-base',
            )}
          >
            <option value="">Choose a pet…</option>
            {pets.map((pet) => (
              <option key={pet.id} value={pet.id}>
                {pet.name} ({pet.species}{pet.breed ? `, ${pet.breed}` : ''})
              </option>
            ))}
          </select>
          {errors.pet && (
            <p className="text-[11px] text-danger">{errors.pet}</p>
          )}
        </div>
      )}

      {/* Complaints */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
          Complaints <span className="text-danger">*</span>
        </label>
        <ComplaintsSelect selected={complaints} onChange={setComplaints} />
        {errors.complaints && (
          <p className="text-[11px] text-danger">{errors.complaints}</p>
        )}
      </div>

      {/* Doctor */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
          Doctor <span className="text-danger">*</span>
        </label>
        <select
          value={doctorId}
          onChange={(e) => {
            setDoctorId(e.target.value)
            setErrors((p) => ({ ...p, doctor: undefined }))
          }}
          disabled={doctorsLoading}
          className={cn(
            'w-full rounded-[4px] border bg-white px-3 py-[9px] text-[13px] font-medium text-foreground focus:border-primary focus:outline-none transition-colors disabled:opacity-50',
            errors.doctor ? 'border-danger' : 'border-border-base',
          )}
        >
          <option value="">
            {doctorsLoading ? 'Loading doctors…' : 'Select a doctor…'}
          </option>
          {doctors.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {doc.name}
            </option>
          ))}
        </select>
        {errors.doctor && (
          <p className="text-[11px] text-danger">{errors.doctor}</p>
        )}
        {!doctorsLoading && doctors.length === 0 && (
          <p className="text-[11px] text-muted">
            No active doctors found. Add doctors in the clinic settings.
          </p>
        )}
      </div>

      {/* Emergency toggle */}
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <div
          role="switch"
          aria-checked={isEmergency}
          onClick={() => setIsEmergency((v) => !v)}
          className={cn(
            'relative h-5 w-9 rounded-full transition-colors cursor-pointer',
            isEmergency ? 'bg-danger' : 'bg-border-base',
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform',
              isEmergency && 'translate-x-4',
            )}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <AlertTriangle
            size={13}
            className={isEmergency ? 'text-danger' : 'text-muted'}
          />
          <span
            className={cn(
              'text-[13px] font-semibold',
              isEmergency ? 'text-danger' : 'text-muted',
            )}
          >
            Emergency
          </span>
        </div>
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-[4px] bg-primary px-4 py-[9px] text-[13px] font-semibold text-white hover:opacity-85 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Checking in…' : 'Check In'}
      </button>
    </form>
  )
}
