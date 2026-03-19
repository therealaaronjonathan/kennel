import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useVisitDetail } from '../services/use-visit-detail'
import { useClinicDiagnoses } from '../services/use-clinic-diagnoses'
import { useClinicMedicines } from '../services/use-clinic-medicines'
import { useClinicServices } from '../services/use-clinic-services'
import { completeVisit, type ConsultationFormData } from '../services/complete-visit'
import { addClinicDiagnosis } from '@/features/settings/services/clinic-lists-service'
import { DiagnosisSelect, type DiagnosisEntry } from './diagnosis-select'
import { MedicineSelect, type PrescriptionEntry } from './medicine-select'
import { ServicesSelect, type ServiceEntry } from './services-select'
import type { VetQueueEntry } from '../services/use-vet-queue'

interface ConsultationViewProps {
  entry: VetQueueEntry
  clinicId: string
  branchId: string
  onCompleted: () => void
}

const SPECIES_LABEL: Record<string, string> = {
  dog: 'Dog',
  cat: 'Cat',
  bird: 'Bird',
  rabbit: 'Rabbit',
  other: 'Other',
}

export function ConsultationView({ entry, clinicId, branchId, onCompleted }: ConsultationViewProps) {
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
          </div>
        )}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {detailLoading ? (
          <p className="text-[12px] text-muted">Loading patient details…</p>
        ) : (
          <>
            {/* Last visit summary */}
            {lastVisit ? (
              <div className="rounded-[4px] border border-border-base bg-surface-2 p-4 space-y-2">
                <p className={cn(labelClass, 'mb-1')}>Last Visit · {lastVisit.date}</p>
                {lastVisit.diagnosis && (
                  <div>
                    <p className="text-[11px] text-muted font-medium">Diagnosis</p>
                    <p className="text-[13px] text-foreground">{lastVisit.diagnosis}</p>
                  </div>
                )}
                {lastVisit.medicines && (
                  <div>
                    <p className="text-[11px] text-muted font-medium">Medicines</p>
                    <p className="text-[13px] text-foreground">{lastVisit.medicines}</p>
                  </div>
                )}
                {!lastVisit.diagnosis && !lastVisit.medicines && (
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

      {/* Footer */}
      <div className="border-t border-border-base px-6 py-4 flex-shrink-0">
        {complete.isError && (
          <p className="mb-3 text-[12px] text-danger">
            {(complete.error as Error)?.message ?? 'Failed to save. Try again.'}
          </p>
        )}
        <button
          type="button"
          disabled={complete.isPending}
          onClick={() => complete.mutate()}
          className="w-full rounded-[4px] bg-primary px-4 py-[10px] text-[13px] font-semibold text-white hover:opacity-85 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {complete.isPending ? 'Saving…' : 'Mark Complete'}
        </button>
      </div>
    </div>
  )
}
