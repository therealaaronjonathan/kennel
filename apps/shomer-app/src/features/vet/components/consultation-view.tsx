import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { AlertTriangle, ChevronDown, ChevronUp, PhoneCall, PauseCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useVisitDetail } from '../services/use-visit-detail'
import { useClinicDiagnoses } from '../services/use-clinic-diagnoses'
import { useClinicMedicines } from '../services/use-clinic-medicines'
import { useClinicServices } from '../services/use-clinic-services'
import { completeVisit, type ConsultationFormData } from '../services/complete-visit'
import { markVisitInProgress } from '../services/mark-in-progress'
import { pauseVisit } from '../services/pause-visit'
import { addClinicDiagnosis } from '@/features/settings/services/clinic-lists-service'
import { DiagnosisSelect, type DiagnosisEntry } from './diagnosis-select'
import { MedicineSelect, type PrescriptionEntry } from './medicine-select'
import { ServicesSelect, type ServiceEntry } from './services-select'
import type { VetQueueEntry } from '../services/use-vet-queue'

interface ConsultationViewProps {
  entry: VetQueueEntry
  clinicId: string
  branchId: string
  hasInProgress: boolean
  onCompleted: () => void
}

const SPECIES_LABEL: Record<string, string> = {
  dog: 'Dog',
  cat: 'Cat',
  bird: 'Bird',
  rabbit: 'Rabbit',
  other: 'Other',
}

export function ConsultationView({ entry, clinicId, branchId, hasInProgress, onCompleted }: ConsultationViewProps) {
  const { detail, loading: detailLoading } = useVisitDetail(
    clinicId,
    branchId,
    entry.id,
    entry.petId,
    entry.ownerId,
  )
  const { diagnoses, loading: diagLoading } = useClinicDiagnoses(clinicId)
  const { medicines, loading: medLoading } = useClinicMedicines(clinicId)
  const { services: serviceItems, loading: svcLoading } = useClinicServices(clinicId)

  const [selectedDiagnoses, setSelectedDiagnoses] = useState<DiagnosisEntry[]>([])
  const [consultationNotes, setConsultationNotes] = useState('')
  const [selectedMedicines, setSelectedMedicines] = useState<PrescriptionEntry[]>([])
  const [selectedServices, setSelectedServices] = useState<ServiceEntry[]>([])
  const [vaccineOpen, setVaccineOpen] = useState(false)
  const [vaccineName, setVaccineName] = useState('')
  const [vaccineBatch, setVaccineBatch] = useState('')
  const [vaccineNextDue, setVaccineNextDue] = useState('')

  const callPatient = useMutation({
    mutationFn: () => markVisitInProgress(clinicId, branchId, entry.id),
  })

  const pause = useMutation({
    mutationFn: () => pauseVisit(clinicId, branchId, entry.id),
  })

  const complete = useMutation({
    mutationFn: () => {
      const form: ConsultationFormData = {
        diagnoses: selectedDiagnoses,
        consultationNotes,
        medicines: selectedMedicines,
        services: selectedServices,
        vaccineName,
        vaccineBatch,
        vaccineNextDue,
      }
      return completeVisit(clinicId, branchId, entry.id, form)
    },
    onSuccess: onCompleted,
  })

  async function handleSaveToClinic(name: string) {
    await addClinicDiagnosis(clinicId, name)
  }

  const pet = detail?.pet
  const owner = detail?.owner
  const lastVisit = detail?.lastVisit

  const labelClass = 'text-[10px] font-semibold uppercase tracking-[0.08em] text-muted'
  const inputClass =
    'w-full rounded-[4px] border border-border-base bg-surface px-3 py-2 text-[13px] text-foreground placeholder:text-muted/50 focus:border-primary focus:outline-none transition-colors resize-none'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border-base px-6 py-4 flex-shrink-0">
        <div className="flex items-start gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-[22px] font-bold text-primary leading-none">
                {entry.tokenDisplay}
              </span>
              {entry.isEmergency && (
                <span className="flex items-center gap-1 rounded-[3px] bg-danger/10 border border-danger/25 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-danger">
                  <AlertTriangle size={9} />
                  Emergency
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[15px] font-bold text-foreground">
              {entry.petName}
              {pet && (
                <span className="ml-1.5 text-[12px] font-medium text-muted">
                  · {SPECIES_LABEL[pet.species] ?? pet.species}
                  {pet.breed ? `, ${pet.breed}` : ''}
                  {pet.age ? `, ${pet.age}y` : ''}
                </span>
              )}
            </p>
            <p className="text-[12px] text-muted">
              {entry.ownerName}
              {owner?.phone ? ` · ${owner.phone}` : ''}
            </p>
          </div>
        </div>

        {/* Service badge */}
        {entry.service && (
          <div className="mt-2">
            <span className="inline-flex rounded-[3px] bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-primary">
              {entry.service}
            </span>
          </div>
        )}

        {/* Complaints */}
        {entry.complaints.length > 0 && (
          <div className="mt-3">
            <p className={cn(labelClass, 'mb-1.5')}>Complaints</p>
            <div className="flex flex-wrap gap-1.5">
              {entry.complaints.map((c) => (
                <span
                  key={c}
                  className="rounded-[3px] bg-surface-2 border border-border-base px-2 py-0.5 text-[11px] font-medium text-muted"
                >
                  {c}
                </span>
              ))}
            </div>
            {entry.otherComplaintText && (
              <p className="mt-1.5 text-[12px] text-foreground italic">
                "{entry.otherComplaintText}"
              </p>
            )}
          </div>
        )}

        {/* Grooming services */}
        {entry.groomingServices && entry.groomingServices.length > 0 && (
          <div className="mt-3">
            <p className={cn(labelClass, 'mb-1.5')}>Grooming Services</p>
            <div className="flex flex-wrap gap-1.5">
              {entry.groomingServices.map((svc) => (
                <span
                  key={svc}
                  className="rounded-[3px] bg-surface-2 border border-border-base px-2 py-0.5 text-[11px] font-medium text-muted"
                >
                  {svc}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Call Patient gate — shown when patient is still waiting */}
      {entry.status === 'waiting' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <PhoneCall size={20} className="text-primary" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-foreground">Ready to call this patient?</p>
            <p className="mt-1 text-[12px] text-muted">
              Calling will mark this token as in-progress and notify the receptionist.
            </p>
          </div>
          {hasInProgress && (
            <p className="text-[11px] text-warning font-semibold">
              Another patient is already in consultation. Complete it first.
            </p>
          )}
          <button
            type="button"
            disabled={hasInProgress || callPatient.isPending}
            onClick={() => callPatient.mutate()}
            className="flex items-center gap-2 rounded-[4px] bg-primary px-5 py-[10px] text-[13px] font-semibold text-white hover:opacity-85 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <PhoneCall size={14} />
            {callPatient.isPending ? 'Calling…' : 'Call Patient'}
          </button>
          {callPatient.isError && (
            <p className="text-[11px] text-danger">Failed to update status. Try again.</p>
          )}
        </div>
      )}

      {/* Scrollable body — shown when in-progress */}
      {entry.status === 'in-progress' && (
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {detailLoading ? (
          <p className="text-[12px] text-muted">Loading patient details…</p>
        ) : (
          <>
            {/* Last visit summary */}
            {lastVisit ? (
              <div className="rounded-[4px] border border-border-base bg-surface-2 p-4 space-y-3">
                <p className={cn(labelClass)}>Last Visit · {lastVisit.date}</p>

                {/* Diagnoses */}
                {lastVisit.diagnoses.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">Diagnosis</p>
                    {lastVisit.diagnoses.map((d, i) => (
                      <div key={i}>
                        <p className="text-[13px] font-semibold text-foreground">{d.name}</p>
                        {d.notes && (
                          <p className="text-[12px] text-muted leading-relaxed">{d.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Consultation notes */}
                {lastVisit.consultationNotes && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">Doctor's Notes</p>
                    <p className="text-[12px] text-foreground leading-relaxed whitespace-pre-wrap">
                      {lastVisit.consultationNotes}
                    </p>
                  </div>
                )}

                {/* Medicines */}
                {lastVisit.medicines.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">Medicines</p>
                    {lastVisit.medicines.map((m, i) => {
                      const times = [
                        m.morning && 'Morning',
                        m.afternoon && 'Afternoon',
                        m.evening && 'Evening',
                        m.night && 'Night',
                      ].filter(Boolean).join(' · ')
                      return (
                        <div key={i}>
                          <p className="text-[13px] font-semibold text-foreground">{m.name}</p>
                          <p className="text-[11px] text-muted">
                            {times || 'As prescribed'} · {m.days} day{m.days !== 1 ? 's' : ''}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Vaccines */}
                {lastVisit.vaccines.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">Vaccines</p>
                    {lastVisit.vaccines.map((v, i) => (
                      <div key={i} className="rounded-[4px] bg-surface px-3 py-2 space-y-0.5">
                        <p className="text-[12px] font-semibold text-foreground">{v.name}</p>
                        {v.batch && <p className="text-[11px] text-muted">Batch: {v.batch}</p>}
                        {v.nextDue && <p className="text-[11px] text-muted">Next due: {v.nextDue}</p>}
                      </div>
                    ))}
                  </div>
                )}

                {lastVisit.diagnoses.length === 0 && !lastVisit.consultationNotes && lastVisit.medicines.length === 0 && lastVisit.vaccines.length === 0 && (
                  <p className="text-[12px] text-muted">No notes recorded for last visit.</p>
                )}
              </div>
            ) : (
              <div className="rounded-[4px] border border-border-base bg-surface px-4 py-3">
                <p className={cn(labelClass, 'mb-1')}>New Patient</p>
                {pet && (
                  <p className="text-[12px] text-muted">
                    {SPECIES_LABEL[pet.species] ?? pet.species}
                    {pet.breed ? ` · ${pet.breed}` : ''}
                    {pet.age ? ` · ${pet.age} years old` : ''}
                    {pet.microchipNumber ? ` · Chip: ${pet.microchipNumber}` : ''}
                  </p>
                )}
              </div>
            )}

            {/* Consultation form */}
            <div className="space-y-5">
              {/* Diagnosis */}
              <div className="space-y-1.5">
                <label className={labelClass}>Diagnosis</label>
                <DiagnosisSelect
                  selected={selectedDiagnoses}
                  onChange={setSelectedDiagnoses}
                  items={diagnoses}
                  loading={diagLoading}
                  onSaveToClinic={handleSaveToClinic}
                />
              </div>

              {/* Overall consultation notes */}
              <div className="space-y-1.5">
                <label className={labelClass}>Consultation Notes</label>
                <textarea
                  rows={3}
                  placeholder="Overall clinical findings, observations…"
                  value={consultationNotes}
                  onChange={(e) => setConsultationNotes(e.target.value)}
                  className={inputClass}
                />
              </div>

              {/* Medicines */}
              <div className="space-y-1.5">
                <label className={labelClass}>Medicines Prescribed</label>
                <MedicineSelect
                  selected={selectedMedicines}
                  onChange={setSelectedMedicines}
                  items={medicines}
                  loading={medLoading}
                />
              </div>

              {/* Vaccine accordion */}
              <div className="rounded-[4px] border border-border-base overflow-hidden">
                <button
                  type="button"
                  onClick={() => setVaccineOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-surface hover:bg-surface-2 transition-colors"
                >
                  <span className={labelClass}>Vaccine Details</span>
                  {vaccineOpen ? (
                    <ChevronUp size={13} className="text-muted" />
                  ) : (
                    <ChevronDown size={13} className="text-muted" />
                  )}
                </button>
                {vaccineOpen && (
                  <div className="px-4 pb-4 pt-3 bg-surface space-y-3">
                    <div className="space-y-1.5">
                      <label className={labelClass}>Vaccine Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Rabies, Parvo"
                        value={vaccineName}
                        onChange={(e) => setVaccineName(e.target.value)}
                        className={cn(inputClass, 'resize-none')}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className={labelClass}>Batch No.</label>
                        <input
                          type="text"
                          placeholder="Batch number"
                          value={vaccineBatch}
                          onChange={(e) => setVaccineBatch(e.target.value)}
                          className={cn(inputClass, 'resize-none')}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className={labelClass}>Next Due</label>
                        <input
                          type="date"
                          value={vaccineNextDue}
                          onChange={(e) => setVaccineNextDue(e.target.value)}
                          className={cn(inputClass, 'resize-none')}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Services */}
              <div className="space-y-1.5">
                <label className={labelClass}>Services Availed</label>
                <ServicesSelect
                  selected={selectedServices}
                  onChange={setSelectedServices}
                  items={serviceItems}
                  loading={svcLoading}
                />
              </div>
            </div>
          </>
        )}
      </div>
      )}

      {/* Footer — only shown when in-progress */}
      {entry.status === 'in-progress' && (
        <div className="border-t border-border-base px-6 py-4 flex-shrink-0 space-y-2">
          {complete.isError && (
            <p className="mb-1 text-[12px] text-danger">
              {(complete.error as Error)?.message ?? 'Failed to save. Try again.'}
            </p>
          )}
          <button
            type="button"
            disabled={complete.isPending || pause.isPending}
            onClick={() => complete.mutate()}
            className="w-full rounded-[4px] bg-primary px-4 py-[10px] text-[13px] font-semibold text-white hover:opacity-85 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {complete.isPending ? 'Saving…' : 'Mark Complete'}
          </button>
          <button
            type="button"
            disabled={pause.isPending || complete.isPending}
            onClick={() => pause.mutate()}
            className="w-full flex items-center justify-center gap-2 rounded-[4px] border border-border-base px-4 py-[9px] text-[13px] font-semibold text-muted hover:text-foreground hover:border-foreground/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <PauseCircle size={14} />
            {pause.isPending ? 'Pausing…' : 'Pause — Patient Not Present'}
          </button>
        </div>
      )}
    </div>
  )
}
