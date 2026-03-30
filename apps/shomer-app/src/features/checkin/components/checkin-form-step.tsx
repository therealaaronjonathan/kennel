import { useState } from 'react'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ComplaintsSelect } from './complaints-select'
import { useDoctors } from '../services/use-doctors'
import { useCheckinServices } from '../services/use-checkin-services'
import { useGroomingServices } from '../services/use-grooming-services'
import type { Pet, CheckinFormData } from '../types'

interface CheckinFormStepProps {
  clinicId: string
  branchId: string
  pets: Pet[]            // empty if new owner (pet already captured in registration)
  isNewOwner: boolean
  selectedPetId?: string // pre-selected from pet search
  defaultValues?: CheckinFormData  // restored from session on tab-switch
  onFormChange?: (inputs: CheckinFormData) => void  // persists form state to session
  onDutyIds: string[]    // only show these doctors in the dropdown
  onSubmit: (data: CheckinFormData, doctorName: string) => void
  onBack: () => void
  isSubmitting: boolean
}

export function CheckinFormStep({
  clinicId,
  branchId,
  pets,
  isNewOwner,
  selectedPetId,
  defaultValues,
  onFormChange,
  onDutyIds,
  onSubmit,
  onBack,
  isSubmitting,
}: CheckinFormStepProps) {
  const { data: allDoctors = [], isLoading: doctorsLoading } = useDoctors(clinicId, branchId)
  const doctors = onDutyIds.length > 0 ? allDoctors.filter((d) => onDutyIds.includes(d.id)) : []
  const { services: checkinServices, loading: servicesLoading } = useCheckinServices(clinicId)
  const { groomingServices, loading: groomingLoading } = useGroomingServices(clinicId)

  const [petId, setPetId] = useState(defaultValues?.petId ?? selectedPetId ?? (pets.length === 1 ? pets[0].id : ''))
  const [service, setService] = useState(defaultValues?.service ?? '')
  const [complaints, setComplaints] = useState<string[]>(defaultValues?.complaints ?? [])
  const [otherComplaintText, setOtherComplaintText] = useState(defaultValues?.otherComplaintText ?? '')
  const [selectedGroomingServices, setSelectedGroomingServices] = useState<string[]>(defaultValues?.groomingServices ?? [])
  const [doctorId, setDoctorId] = useState(defaultValues?.doctorId ?? '')
  const [isEmergency, setIsEmergency] = useState(defaultValues?.isEmergency ?? false)
  const [errors, setErrors] = useState<{
    pet?: string
    service?: string
    complaints?: string
    otherComplaint?: string
    groomingServices?: string
    doctor?: string
  }>({})

  const isConsultation = service.toLowerCase() === 'consultation'
  const isGrooming = service.toLowerCase() === 'grooming'

  function validate(): boolean {
    const next: typeof errors = {}
    if (!isNewOwner && pets.length > 1 && !petId) next.pet = 'Select a pet'
    if (!service) next.service = 'Select a service'
    if (isConsultation) {
      if (complaints.length === 0) next.complaints = 'Select at least one complaint'
      if (complaints.includes('Other') && !otherComplaintText.trim()) {
        next.otherComplaint = 'Please describe the complaint'
      }
    }
    if (isGrooming && selectedGroomingServices.length === 0) {
      next.groomingServices = 'Select at least one grooming service'
    }
    if (!doctorId) next.doctor = 'Select a doctor'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    const resolvedPetId = isNewOwner ? '' : (pets.length === 1 ? pets[0].id : petId)
    const doctor = doctors.find((d) => d.id === doctorId)
    onSubmit(
      {
        petId: resolvedPetId,
        service,
        complaints: isConsultation ? complaints : [],
        otherComplaintText: isConsultation && complaints.includes('Other') ? otherComplaintText.trim() : undefined,
        groomingServices: isGrooming ? selectedGroomingServices : [],
        doctorId,
        isEmergency,
      },
      doctor?.name ?? '',
    )
  }

  function toggleGroomingService(name: string) {
    const newServices = selectedGroomingServices.includes(name)
      ? selectedGroomingServices.filter((s) => s !== name)
      : [...selectedGroomingServices, name]
    setSelectedGroomingServices(newServices)
    setErrors((p) => ({ ...p, groomingServices: undefined }))
    onFormChange?.({ petId, service, complaints, otherComplaintText, groomingServices: newServices, doctorId, isEmergency })
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
              const v = e.target.value
              setPetId(v)
              setErrors((p) => ({ ...p, pet: undefined }))
              onFormChange?.({ petId: v, service, complaints, otherComplaintText, groomingServices: selectedGroomingServices, doctorId, isEmergency })
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

      {/* Service selector */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
          Service <span className="text-danger">*</span>
        </label>
        <select
          value={service}
          onChange={(e) => {
            const v = e.target.value
            setService(v)
            setComplaints([])
            setOtherComplaintText('')
            setSelectedGroomingServices([])
            setErrors((p) => ({ ...p, service: undefined, complaints: undefined, groomingServices: undefined }))
            onFormChange?.({ petId, service: v, complaints: [], otherComplaintText: '', groomingServices: [], doctorId, isEmergency })
          }}
          disabled={servicesLoading}
          className={cn(
            'w-full rounded-[4px] border bg-white px-3 py-[9px] text-[13px] font-medium text-foreground focus:border-primary focus:outline-none transition-colors disabled:opacity-50',
            errors.service ? 'border-danger' : 'border-border-base',
          )}
        >
          <option value="">
            {servicesLoading ? 'Loading services…' : 'Select a service…'}
          </option>
          {checkinServices.map((svc) => (
            <option key={svc.id} value={svc.name}>
              {svc.name}
            </option>
          ))}
        </select>
        {errors.service && (
          <p className="text-[11px] text-danger">{errors.service}</p>
        )}
      </div>

      {/* Complaints — only for Consultation */}
      {isConsultation && (
        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
            Complaints <span className="text-danger">*</span>
          </label>
          <ComplaintsSelect
            selected={complaints}
            onChange={(val) => {
              setComplaints(val)
              setErrors((p) => ({ ...p, complaints: undefined }))
              onFormChange?.({ petId, service, complaints: val, otherComplaintText, groomingServices: selectedGroomingServices, doctorId, isEmergency })
            }}
            otherText={otherComplaintText}
            onOtherTextChange={(val) => {
              setOtherComplaintText(val)
              setErrors((p) => ({ ...p, otherComplaint: undefined }))
              onFormChange?.({ petId, service, complaints, otherComplaintText: val, groomingServices: selectedGroomingServices, doctorId, isEmergency })
            }}
          />
          {errors.complaints && (
            <p className="text-[11px] text-danger">{errors.complaints}</p>
          )}
          {errors.otherComplaint && (
            <p className="text-[11px] text-danger">{errors.otherComplaint}</p>
          )}
        </div>
      )}

      {/* Grooming services — only for Grooming */}
      {isGrooming && (
        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
            Grooming Services <span className="text-danger">*</span>
          </label>
          {groomingLoading ? (
            <p className="text-[12px] text-muted">Loading grooming services…</p>
          ) : groomingServices.length === 0 ? (
            <p className="text-[12px] text-muted">
              No grooming services configured. Add them in Firestore under{' '}
              <code className="text-[11px] bg-surface-2 px-1 rounded">
                clinics/{'{'}clinicId{'}'}/groomingServices
              </code>.
            </p>
          ) : (
            <div className="rounded-[4px] border border-border-base bg-white">
              {groomingServices.map((svc) => {
                const isSelected = selectedGroomingServices.includes(svc.name)
                return (
                  <label
                    key={svc.id}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors hover:bg-surface',
                      isSelected && 'bg-surface-2',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleGroomingService(svc.name)}
                      className="accent-primary h-3.5 w-3.5 flex-shrink-0"
                    />
                    <span className="text-[13px] font-medium text-foreground">
                      {svc.name}
                    </span>
                  </label>
                )
              })}
            </div>
          )}
          {errors.groomingServices && (
            <p className="text-[11px] text-danger">{errors.groomingServices}</p>
          )}
        </div>
      )}

      {/* Doctor */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
          Doctor <span className="text-danger">*</span>
        </label>
        <select
          value={doctorId}
          onChange={(e) => {
            const v = e.target.value
            setDoctorId(v)
            setErrors((p) => ({ ...p, doctor: undefined }))
            onFormChange?.({ petId, service, complaints, otherComplaintText, groomingServices: selectedGroomingServices, doctorId: v, isEmergency })
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
            No doctors on duty. Go to Settings to mark doctors as on duty.
          </p>
        )}
      </div>

      {/* Emergency toggle */}
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <div
          role="switch"
          aria-checked={isEmergency}
          tabIndex={0}
          onClick={() => {
            const v = !isEmergency
            setIsEmergency(v)
            onFormChange?.({ petId, service, complaints, otherComplaintText, groomingServices: selectedGroomingServices, doctorId, isEmergency: v })
          }}
          onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault()
              const v = !isEmergency
              setIsEmergency(v)
              onFormChange?.({ petId, service, complaints, otherComplaintText, groomingServices: selectedGroomingServices, doctorId, isEmergency: v })
            }
          }}
          className={cn(
            'relative h-5 w-9 rounded-full transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2',
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
