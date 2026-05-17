import { useEffect, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  PhoneCall,
  PauseCircle,
  History,
  Pill,
  Plus,
  Syringe,
  Stethoscope,
  Receipt,
  Thermometer,
  Wallet,
  UserCheck,
  Scale,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getAgeFromDob } from '@/lib/age'
import { useVisitDetail } from '../services/use-visit-detail'
import { useClinicDiagnoses } from '../services/use-clinic-diagnoses'
import { useClinicMedicines } from '../services/use-clinic-medicines'
import { useClinicServices } from '../services/use-clinic-services'
import { completeVisit, type ConsultationFormData } from '../services/complete-visit'
import { markVisitInProgress } from '../services/mark-in-progress'
import { pauseVisit } from '../services/pause-visit'
import { reassignVisit } from '../services/reassign-visit'
import {
  saveConsultationDraft,
  type ConsultationDraftInput,
} from '../services/consultation-draft'
import { addClinicDiagnosis } from '@/features/settings/services/clinic-lists-service'
import { DiagnosisSelect, type DiagnosisEntry } from './diagnosis-select'
import {
  MedicineSelect,
  entryHasError,
  MEDICINE_ENTRY_DOM_ID,
  type PrescriptionEntry,
} from './medicine-select'
import { ServicesSelect, type ServiceEntry } from '@/components/blocks/services-select'
import { formatInr } from '@/lib/utils'
import { PAYMENT_METHOD_LABELS } from '@/features/checkout/services/complete-billing'
import { EarlierVisitsModal } from './earlier-visits-modal'
import { useDoctors } from '@/features/checkin/services/use-doctors'
import { useDutyRoster } from '@/features/settings/services/use-duty-roster'
import type { VetQueueEntry } from '../services/use-vet-queue'

interface VaccineFormEntry {
  name: string
  batch: string
  nextDue: string
  nextYear: boolean
}

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

function formatDateLong(yyyymmdd: string): string {
  if (!yyyymmdd) return ''
  const [y, m, d] = yyyymmdd.split('-').map(Number)
  if (!y || !m || !d) return yyyymmdd
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatRelative(yyyymmdd: string): string {
  if (!yyyymmdd) return ''
  const [y, m, d] = yyyymmdd.split('-').map(Number)
  if (!y || !m || !d) return ''
  const past = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  past.setHours(0, 0, 0, 0)
  const diffDays = Math.round((today.getTime() - past.getTime()) / 86_400_000)
  if (diffDays <= 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) {
    const w = Math.round(diffDays / 7)
    return `${w} week${w === 1 ? '' : 's'} ago`
  }
  if (diffDays < 365) {
    const mo = Math.round(diffDays / 30)
    return `${mo} month${mo === 1 ? '' : 's'} ago`
  }
  const yrs = Math.round(diffDays / 365)
  return `${yrs} year${yrs === 1 ? '' : 's'} ago`
}

function isOverdue(yyyymmdd: string | undefined): boolean {
  if (!yyyymmdd) return false
  const [y, m, d] = yyyymmdd.split('-').map(Number)
  if (!y || !m || !d) return false
  const target = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return target.getTime() < today.getTime()
}

function formatTimingDays(m: {
  morning: boolean; afternoon: boolean; evening: boolean; night: boolean; days: number; mealTiming?: 'before' | 'after'
}): string {
  const times = [
    m.morning && 'Morning',
    m.afternoon && 'Afternoon',
    m.evening && 'Evening',
    m.night && 'Night',
  ].filter(Boolean) as string[]
  const timing = times.length ? times.join(' · ') : 'As prescribed'
  const meal = m.mealTiming === 'before' ? ' · Before food' : m.mealTiming === 'after' ? ' · After food' : ''
  return `${timing} · ${m.days} day${m.days !== 1 ? 's' : ''}${meal}`
}

function formatDose(type?: string, quantity?: string): string | null {
  if (!quantity) return null
  if (type === 'tablet') {
    if (quantity === '1') return 'Full tablet'
    if (quantity === '1/2') return 'Half tablet'
    return `${quantity} tablet`
  }
  if (type === 'syrup') return `${quantity} ml`
  if (type === 'other') return `${quantity} ml`
  return quantity
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
  const { data: allDoctors = [] } = useDoctors(clinicId, branchId)
  const { onDuty } = useDutyRoster(clinicId, branchId)
  const vaccinationServices = serviceItems.filter(
    (s) => s.serviceType?.toLowerCase() === 'vaccination',
  )

  // Rehydrate from saved draft on mount (component is keyed by entry.id, so
  // switching patients remounts and re-reads the draft for that visit).
  const draft = entry.consultationDraft
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<DiagnosisEntry[]>(
    () => draft?.diagnoses ?? [],
  )
  const [consultationNotes, setConsultationNotes] = useState(
    () => draft?.consultationNotes ?? '',
  )
  const [selectedMedicines, setSelectedMedicines] = useState<PrescriptionEntry[]>(
    () => draft?.medicines ?? [],
  )
  const [selectedServices, setSelectedServices] = useState<ServiceEntry[]>(
    () => draft?.services ?? [],
  )
  const [petWeightKg, setPetWeightKg] = useState<string>(() =>
    draft?.petWeightKg != null ? String(draft.petWeightKg) : '',
  )
  const [petTemperatureF, setPetTemperatureF] = useState<string>(() =>
    draft?.petTemperatureF != null ? String(draft.petTemperatureF) : '',
  )
  const [showConfirm, setShowConfirm] = useState(false)
  const [vaccineEntries, setVaccineEntries] = useState<VaccineFormEntry[]>(() => {
    if (draft?.vaccines?.length) {
      return draft.vaccines.map((v) => ({ ...v, nextYear: false }))
    }
    return []
  })
  const [vaccineOpen, setVaccineOpen] = useState(() => !!(draft?.vaccines?.length))
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)
  const [showEarlierVisits, setShowEarlierVisits] = useState(false)
  const [lastVisitOpen, setLastVisitOpen] = useState(false)
  const [showReassignDialog, setShowReassignDialog] = useState(false)
  const [reassignDoctorId, setReassignDoctorId] = useState('')

  // ── Validation ────────────────────────────────────────────────────────────
  const vaccineErrors = vaccineEntries.map((entry) => ({
    nameMissing: !!(!entry.name && (entry.batch || entry.nextDue)),
    nextDueMissing: !!(entry.name && !entry.nextDue),
  }))

  function findFirstErrorElementId(): string | null {
    const idx = selectedMedicines.findIndex(entryHasError)
    if (idx >= 0) return MEDICINE_ENTRY_DOM_ID(idx)
    for (let i = 0; i < vaccineErrors.length; i++) {
      if (vaccineErrors[i].nameMissing) return `vaccine-name-field-${i}`
      if (vaccineErrors[i].nextDueMissing) return `vaccine-next-due-field-${i}`
    }
    return null
  }

  function handleMarkCompleteClick() {
    setAttemptedSubmit(true)
    const firstErrorId = findFirstErrorElementId()
    if (firstErrorId) {
      // Open vaccine accordion if the error is in there
      if (firstErrorId.startsWith('vaccine-')) setVaccineOpen(true)
      // Defer scroll so the accordion has time to expand if needed
      setTimeout(() => {
        document
          .getElementById(firstErrorId)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 30)
      return
    }
    setShowConfirm(true)
  }

  function handleVaccineNameChange(idx: number, newName: string) {
    const oldName = vaccineEntries[idx].name
    setVaccineEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, name: newName } : e)))
    setSelectedServices((prev) => {
      let updated = [...prev]
      if (oldName) {
        const removeIdx = updated.findIndex((s) => s.name === oldName)
        if (removeIdx >= 0) {
          if (updated[removeIdx].quantity > 1) {
            updated = updated.map((s, i) => i === removeIdx ? { ...s, quantity: s.quantity - 1 } : s)
          } else {
            updated = updated.filter((_, i) => i !== removeIdx)
          }
        }
      }
      if (newName) {
        const svc = vaccinationServices.find((s) => s.name === newName)
        if (svc) {
          const existingIdx = updated.findIndex((s) => s.name === newName)
          if (existingIdx >= 0) {
            updated = updated.map((s, i) => i === existingIdx ? { ...s, quantity: s.quantity + 1 } : s)
          } else {
            updated = [...updated, { serviceId: svc.id, name: svc.name, price: svc.price, quantity: 1 }]
          }
        }
      }
      return updated
    })
  }

  function addVaccineEntry() {
    setVaccineEntries((prev) => [...prev, { name: '', batch: '', nextDue: '', nextYear: false }])
    setVaccineOpen(true)
  }

  function removeVaccineEntry(idx: number) {
    const entry = vaccineEntries[idx]
    setVaccineEntries((prev) => prev.filter((_, i) => i !== idx))
    if (entry.name) {
      setSelectedServices((prev) => {
        const removeIdx = prev.findIndex((s) => s.name === entry.name)
        if (removeIdx < 0) return prev
        if (prev[removeIdx].quantity > 1) {
          return prev.map((s, i) => i === removeIdx ? { ...s, quantity: s.quantity - 1 } : s)
        }
        return prev.filter((_, i) => i !== removeIdx)
      })
    }
  }

  function toggleVaccineNextYear(idx: number, on: boolean) {
    if (on) {
      const d = new Date()
      d.setFullYear(d.getFullYear() + 1)
      const nextDue = d.toISOString().split('T')[0]
      setVaccineEntries((prev) =>
        prev.map((e, i) => (i === idx ? { ...e, nextDue, nextYear: true } : e)),
      )
    } else {
      setVaccineEntries((prev) =>
        prev.map((e, i) => (i === idx ? { ...e, nextDue: '', nextYear: false } : e)),
      )
    }
  }

  const callPatient = useMutation({
    mutationFn: () => markVisitInProgress(clinicId, branchId, entry.id),
  })

  function buildDraft(): ConsultationDraftInput {
    const weightNum = parseFloat(petWeightKg)
    const tempNum = parseFloat(petTemperatureF)
    return {
      diagnoses: selectedDiagnoses,
      consultationNotes,
      medicines: selectedMedicines,
      services: selectedServices,
      vaccines: vaccineEntries.map((v) => ({ name: v.name, batch: v.batch, nextDue: v.nextDue })),
      petWeightKg: !isNaN(weightNum) && weightNum > 0 ? weightNum : undefined,
      petTemperatureF: !isNaN(tempNum) && tempNum > 0 ? tempNum : undefined,
    }
  }

  const pause = useMutation({
    mutationFn: () => pauseVisit(clinicId, branchId, entry.id, buildDraft()),
  })

  // ── Background autosave ──────────────────────────────────────────────────
  // Debounced 30s after the last edit. Silent — no UI. Skips the initial
  // mount (so we never overwrite a fresh-loaded draft with empty initial
  // state). Only runs while the visit is actively in-progress.
  const skipNextAutosave = useRef(true)
  useEffect(() => {
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false
      return
    }
    if (entry.status !== 'in-progress') return
    const timer = window.setTimeout(() => {
      saveConsultationDraft(clinicId, branchId, entry.id, buildDraft()).catch(() => {
        // intentionally silent — autosave is best-effort
      })
    }, 30_000)
    return () => clearTimeout(timer)
  }, [
    clinicId,
    branchId,
    entry.id,
    entry.status,
    selectedDiagnoses,
    consultationNotes,
    selectedMedicines,
    selectedServices,
    vaccineEntries,
    petWeightKg,
    petTemperatureF,
  ])

  const complete = useMutation({
    mutationFn: () => {
      const draft = buildDraft()
      const form: ConsultationFormData = {
        diagnoses: selectedDiagnoses,
        consultationNotes,
        medicines: selectedMedicines,
        services: selectedServices,
        vaccines: vaccineEntries.map((v) => ({ name: v.name, batch: v.batch, nextDue: v.nextDue })),
        petWeightKg: draft.petWeightKg,
        petTemperatureF: draft.petTemperatureF,
      }
      return completeVisit(clinicId, branchId, entry.id, form)
    },
    onSuccess: onCompleted,
  })

  const reassign = useMutation({
    mutationFn: ({ doctorId, doctorName }: { doctorId: string; doctorName: string }) =>
      reassignVisit(clinicId, branchId, entry.id, doctorId, doctorName,
        entry.status === 'in-progress' ? buildDraft() : undefined,
      ),
    onSuccess: () => {
      setShowReassignDialog(false)
      onCompleted()
    },
  })

  const otherDoctors = allDoctors.filter((d) => d.id !== entry.doctorId && onDuty.includes(d.id))

  async function handleConfirmComplete() {
    try {
      await complete.mutateAsync()
      // Save any new custom diagnoses to the clinic catalog after visit is complete
      const customDiagnoses = selectedDiagnoses.filter((d) => d.isCustom)
      await Promise.all(
        customDiagnoses.map((d) => addClinicDiagnosis(clinicId, d.name).catch(() => {})),
      )
      setShowConfirm(false)
    } catch {
      // stay open — complete.isError shows error inside dialog
    }
  }

  const confirmTotal = selectedServices.reduce((sum, s) => sum + s.quantity * s.price, 0)

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
              {pet && (() => {
                const ageLabel = getAgeFromDob(pet.dateOfBirth)
                return (
                  <span className="ml-1.5 text-[12px] font-medium text-muted">
                    · {SPECIES_LABEL[pet.species] ?? pet.species}
                    {pet.breed ? `, ${pet.breed}` : ''}
                    {ageLabel ? `, ${ageLabel}` : ''}
                    {pet.color ? `, ${pet.color}` : ''}
                  </span>
                )
              })()}
            </p>
            {pet?.microchipNumber && (
              <p className="text-[11px] text-muted mt-0.5">
                Chip: <span className="font-semibold text-foreground/80">{pet.microchipNumber}</span>
              </p>
            )}
            <p className="text-[12px] text-muted">
              {entry.ownerName}
              {owner?.phone && (
                <>
                  {' · '}
                  <a
                    href={`tel:${owner.phone}`}
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    {owner.phone}
                  </a>
                </>
              )}
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
          {otherDoctors.length > 0 && (
            <button
              type="button"
              onClick={() => { setReassignDoctorId(''); setShowReassignDialog(true) }}
              className="flex items-center gap-2 text-[12px] font-semibold text-muted hover:text-foreground transition-colors"
            >
              <UserCheck size={13} />
              Reassign to another doctor
            </button>
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
              <div className="rounded-[4px] border border-border-base bg-surface-2 overflow-hidden">
                {/* Header strip — always visible, toggles body */}
                <button
                  type="button"
                  onClick={() => setLastVisitOpen((v) => !v)}
                  aria-expanded={lastVisitOpen}
                  className={cn(
                    'w-full text-left px-4 py-3 bg-surface hover:bg-surface-2/50 transition-colors',
                    lastVisitOpen && 'border-b border-border-base',
                  )}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className={cn(labelClass, 'mb-1')}>Last Visit</p>
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-[14px] font-bold text-foreground">
                          {formatDateLong(lastVisit.date)}
                        </span>
                        <span className="text-[11px] text-muted">
                          {formatRelative(lastVisit.date)}
                        </span>
                      </div>
                      {lastVisit.doctorName && (
                        <p className="mt-0.5 text-[12px] text-muted">
                          Seen by <span className="font-semibold text-foreground/80">{lastVisit.doctorName}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {lastVisit.isEmergency && (
                        <span className="flex items-center gap-1 rounded-[3px] bg-danger/10 border border-danger/25 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-danger">
                          <AlertTriangle size={9} />
                          ER
                        </span>
                      )}
                      {lastVisit.service && (
                        <span className="rounded-[3px] bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-primary">
                          {lastVisit.service}
                        </span>
                      )}
                      {lastVisitOpen ? (
                        <ChevronUp size={14} className="text-muted ml-1" />
                      ) : (
                        <ChevronDown size={14} className="text-muted ml-1" />
                      )}
                    </div>
                  </div>
                  {!lastVisitOpen && (
                    <p className="mt-1.5 text-[11px] text-muted">
                      Tap to view diagnosis, medicines, vaccines, services and payment.
                    </p>
                  )}
                </button>

                {lastVisitOpen && (
                <div className="p-4 space-y-4">
                  {/* Vitals */}
                  {(typeof lastVisit.petWeightKg === 'number' || typeof lastVisit.petTemperatureF === 'number') && (
                    <div className="flex items-center gap-4 flex-wrap">
                      {typeof lastVisit.petWeightKg === 'number' && (
                        <div className="flex items-center gap-2">
                          <Scale size={10} className="text-muted flex-shrink-0" />
                          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">Weight</span>
                          <span className="text-[13px] font-semibold text-foreground">{lastVisit.petWeightKg} kg</span>
                        </div>
                      )}
                      {typeof lastVisit.petTemperatureF === 'number' && (
                        <div className="flex items-center gap-2">
                          <Thermometer size={10} className="text-muted flex-shrink-0" />
                          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">Temp</span>
                          <span className="text-[13px] font-semibold text-foreground">{lastVisit.petTemperatureF}°F</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Complaints */}
                  {(lastVisit.complaints.length > 0 || lastVisit.otherComplaintText) && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">
                        Complaints
                      </p>
                      {lastVisit.complaints.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {lastVisit.complaints.map((c) => (
                            <span
                              key={c}
                              className="rounded-[3px] bg-surface border border-border-base px-2 py-0.5 text-[11px] font-medium text-muted"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                      {lastVisit.otherComplaintText && (
                        <p className="text-[12px] text-foreground italic leading-relaxed">
                          "{lastVisit.otherComplaintText}"
                        </p>
                      )}
                    </div>
                  )}

                  {/* Diagnoses */}
                  {lastVisit.diagnoses.length > 0 && (
                    <div className="space-y-2">
                      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">
                        <Stethoscope size={10} />
                        Diagnosis
                      </p>
                      <div className="space-y-1.5">
                        {lastVisit.diagnoses.map((d, i) => (
                          <div key={i} className="rounded-[4px] bg-surface px-3 py-2">
                            <p className="text-[13px] font-semibold text-foreground">{d.name}</p>
                            {d.notes && (
                              <p className="mt-0.5 text-[12px] text-muted leading-relaxed">{d.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Doctor's notes */}
                  {lastVisit.consultationNotes && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">
                        Doctor's Notes
                      </p>
                      <p className="text-[12px] text-foreground leading-relaxed whitespace-pre-wrap">
                        {lastVisit.consultationNotes}
                      </p>
                    </div>
                  )}

                  {/* Medicines */}
                  {lastVisit.medicines.length > 0 && (
                    <div className="space-y-2">
                      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">
                        <Pill size={10} />
                        Medicines
                      </p>
                      <div className="space-y-1.5">
                        {lastVisit.medicines.map((m, i) => {
                          const dose = formatDose(m.type, m.quantity)
                          return (
                            <div key={i} className="rounded-[4px] bg-surface px-3 py-2">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <p className="text-[13px] font-semibold text-foreground">{m.name}</p>
                                {m.type && (
                                  <span className="rounded-[3px] bg-surface-2 border border-border-base px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-muted">
                                    {m.type}
                                  </span>
                                )}
                              </div>
                              {dose && (
                                <p className="mt-0.5 text-[11px] font-semibold text-foreground/80">{dose}</p>
                              )}
                              <p className="mt-0.5 text-[11px] text-muted">{formatTimingDays(m)}</p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Vaccines */}
                  {lastVisit.vaccines.length > 0 && (
                    <div className="space-y-2">
                      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">
                        <Syringe size={10} />
                        Vaccines
                      </p>
                      <div className="space-y-1.5">
                        {lastVisit.vaccines.map((v, i) => {
                          const overdue = isOverdue(v.nextDue)
                          return (
                            <div key={i} className="rounded-[4px] bg-surface px-3 py-2 space-y-0.5">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <p className="text-[13px] font-semibold text-foreground">{v.name}</p>
                                {overdue && (
                                  <span className="rounded-[3px] bg-danger/10 border border-danger/25 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-danger">
                                    Overdue
                                  </span>
                                )}
                              </div>
                              {v.batch && <p className="text-[11px] text-muted">Batch: {v.batch}</p>}
                              {v.nextDue && (
                                <p className={cn('text-[11px]', overdue ? 'font-semibold text-danger' : 'text-muted')}>
                                  Next due: {formatDateLong(v.nextDue)}
                                </p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Services */}
                  {lastVisit.services.length > 0 && (
                    <div className="space-y-2">
                      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">
                        <Receipt size={10} />
                        Services Availed
                      </p>
                      <div className="rounded-[4px] border border-border-base overflow-hidden divide-y divide-border-base">
                        {lastVisit.services.map((s, i) => (
                          <div key={i} className="flex items-center justify-between px-3 py-2 bg-surface gap-2">
                            <span className="flex-1 text-[12px] text-foreground truncate">{s.name}</span>
                            {(s.quantity ?? 1) > 1 && (
                              <span className="text-[11px] text-muted tabular-nums">{s.quantity}×</span>
                            )}
                            <span className="text-[12px] font-semibold text-foreground tabular-nums">
                              {formatInr((s.quantity ?? 1) * s.price)}
                            </span>
                          </div>
                        ))}
                        {typeof lastVisit.billAmount === 'number' && (
                          <div className="flex items-center justify-between px-3 py-2 bg-surface-2">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">
                              Total
                            </span>
                            <span className="text-[13px] font-bold text-primary tabular-nums">
                              {formatInr(lastVisit.billAmount)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Payment */}
                  {lastVisit.payments && lastVisit.payments.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">
                        <Wallet size={10} />
                        Payment
                      </p>
                      <div className="rounded-[4px] bg-surface px-3 py-2 space-y-1">
                        {lastVisit.payments.map((p, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <span className="text-[12px] font-semibold text-foreground">
                              {PAYMENT_METHOD_LABELS[p.method]}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[12px] font-semibold text-foreground tabular-nums">
                                {formatInr(p.amount)}
                              </span>
                              {i === 0 && lastVisit.status === 'billed' && (
                                <span className="rounded-[3px] bg-success/10 border border-success/25 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-success">
                                  Billed
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty state */}
                  {lastVisit.diagnoses.length === 0 &&
                    !lastVisit.consultationNotes &&
                    lastVisit.medicines.length === 0 &&
                    lastVisit.vaccines.length === 0 &&
                    lastVisit.services.length === 0 &&
                    lastVisit.complaints.length === 0 && (
                      <p className="text-[12px] text-muted">No notes recorded for last visit.</p>
                    )}
                </div>
                )}

                {/* Earlier visits link — only visible when expanded */}
                {lastVisitOpen && detail && detail.earlierVisits.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowEarlierVisits(true)}
                    className="w-full flex items-center justify-center gap-2 border-t border-border-base bg-surface px-4 py-2.5 text-[12px] font-semibold text-primary hover:bg-surface-2 transition-colors"
                  >
                    <History size={12} />
                    View {detail.earlierVisits.length} earlier visit
                    {detail.earlierVisits.length === 1 ? '' : 's'}
                  </button>
                )}
              </div>
            ) : (
              <div className="rounded-[4px] border border-border-base bg-surface px-4 py-3">
                <p className={cn(labelClass, 'mb-1')}>New Patient</p>
                {pet && (() => {
                  const ageLabel = getAgeFromDob(pet.dateOfBirth)
                  return (
                    <p className="text-[12px] text-muted">
                      {SPECIES_LABEL[pet.species] ?? pet.species}
                      {pet.breed ? ` · ${pet.breed}` : ''}
                      {ageLabel ? ` · ${ageLabel} old` : ''}
                      {pet.color ? ` · ${pet.color}` : ''}
                      {pet.microchipNumber ? ` · Chip: ${pet.microchipNumber}` : ''}
                    </p>
                  )
                })()}
              </div>
            )}

            {/* Consultation form */}
            <div className="space-y-5">
              {/* Vitals — weight + temperature */}
              <div className="space-y-1.5">
                <label className={labelClass}>Vitals</label>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Scale size={12} className="text-muted flex-shrink-0" />
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      placeholder="e.g. 12.5"
                      value={petWeightKg}
                      onChange={(e) => setPetWeightKg(e.target.value)}
                      className={cn(inputClass, 'w-28')}
                    />
                    <span className="text-[12px] text-muted">kg</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Thermometer size={12} className="text-muted flex-shrink-0" />
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      placeholder="e.g. 101.5"
                      value={petTemperatureF}
                      onChange={(e) => setPetTemperatureF(e.target.value)}
                      className={cn(inputClass, 'w-28')}
                    />
                    <span className="text-[12px] text-muted">°F</span>
                  </div>
                </div>
              </div>

              {/* Diagnosis */}
              <div className="space-y-1.5">
                <label className={labelClass}>Diagnosis</label>
                <DiagnosisSelect
                  selected={selectedDiagnoses}
                  onChange={setSelectedDiagnoses}
                  items={diagnoses}
                  loading={diagLoading}
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
                  showErrors={attemptedSubmit}
                />
              </div>

              {/* Vaccine accordion */}
              <div className="rounded-[4px] border border-border-base overflow-hidden">
                <button
                  type="button"
                  onClick={() => setVaccineOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-surface hover:bg-surface-2 transition-colors"
                >
                  <span className={cn(labelClass, 'flex items-center gap-1.5')}>
                    <Syringe size={10} />
                    Vaccine Details
                    {vaccineEntries.filter((e) => e.name).length > 0 && (
                      <span className="ml-1 rounded-full bg-primary/15 px-1.5 py-px text-[10px] font-bold text-primary">
                        {vaccineEntries.filter((e) => e.name).length}
                      </span>
                    )}
                  </span>
                  {vaccineOpen ? (
                    <ChevronUp size={13} className="text-muted" />
                  ) : (
                    <ChevronDown size={13} className="text-muted" />
                  )}
                </button>
                {vaccineOpen && (
                  <div className="px-4 pb-4 pt-3 bg-surface space-y-4">
                    {vaccineEntries.map((entry, idx) => (
                      <div key={idx} className="space-y-3">
                        {idx > 0 && <div className="border-t border-border-base pt-1" />}
                        <div id={`vaccine-name-field-${idx}`} className="space-y-1.5 scroll-mt-4">
                          <div className="flex items-center justify-between">
                            <label className={labelClass}>
                              {vaccineEntries.length > 1 ? `Vaccine ${idx + 1}` : 'Vaccine'}
                            </label>
                            <button
                              type="button"
                              onClick={() => removeVaccineEntry(idx)}
                              className="text-[11px] font-semibold text-muted hover:text-danger transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                          <select
                            value={entry.name}
                            onChange={(e) => handleVaccineNameChange(idx, e.target.value)}
                            className={cn(
                              inputClass,
                              'resize-none',
                              attemptedSubmit && vaccineErrors[idx]?.nameMissing && 'border-danger focus:border-danger',
                            )}
                          >
                            <option value="">Select a vaccine…</option>
                            {vaccinationServices.map((v) => (
                              <option key={v.id} value={v.name}>{v.name}</option>
                            ))}
                          </select>
                          {attemptedSubmit && vaccineErrors[idx]?.nameMissing && (
                            <p className="text-[11px] font-semibold text-danger">
                              Pick a vaccine or clear the other vaccine fields.
                            </p>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className={labelClass}>Batch No.</label>
                            <input
                              type="text"
                              placeholder="Batch number (optional)"
                              value={entry.batch}
                              onChange={(e) =>
                                setVaccineEntries((prev) =>
                                  prev.map((v, i) => (i === idx ? { ...v, batch: e.target.value } : v)),
                                )
                              }
                              className={cn(inputClass, 'resize-none')}
                            />
                          </div>
                          <div id={`vaccine-next-due-field-${idx}`} className="space-y-1.5 scroll-mt-4">
                            <div className="flex items-center justify-between">
                              <label className={labelClass}>Next Due</label>
                              <button
                                type="button"
                                onClick={() => toggleVaccineNextYear(idx, !entry.nextYear)}
                                className={cn(
                                  'flex items-center gap-1.5 rounded-[3px] border px-2 py-0.5 text-[10px] font-semibold transition-colors',
                                  entry.nextYear
                                    ? 'border-primary/40 bg-primary/10 text-primary'
                                    : 'border-border-base text-muted hover:text-foreground',
                                )}
                              >
                                <span
                                  className={cn(
                                    'inline-block h-2.5 w-2.5 rounded-full transition-colors',
                                    entry.nextYear ? 'bg-primary' : 'bg-border-base',
                                  )}
                                />
                                Next Year
                              </button>
                            </div>
                            <input
                              type="date"
                              value={entry.nextDue}
                              onChange={(e) => {
                                setVaccineEntries((prev) =>
                                  prev.map((v, i) =>
                                    i === idx ? { ...v, nextDue: e.target.value, nextYear: false } : v,
                                  ),
                                )
                              }}
                              disabled={entry.nextYear}
                              className={cn(
                                inputClass,
                                'resize-none',
                                entry.nextYear && 'opacity-60 cursor-not-allowed',
                                attemptedSubmit && vaccineErrors[idx]?.nextDueMissing && 'border-danger focus:border-danger',
                              )}
                            />
                            {attemptedSubmit && vaccineErrors[idx]?.nextDueMissing && (
                              <p className="text-[11px] font-semibold text-danger">
                                Set the next due date or clear the other vaccine fields.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addVaccineEntry}
                      className="w-full flex items-center justify-center gap-1.5 rounded-[4px] border border-dashed border-border-base px-4 py-2.5 text-[12px] font-semibold text-muted hover:border-primary hover:text-primary transition-colors"
                    >
                      <Plus size={12} />
                      Add Vaccine
                    </button>
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
          <button
            type="button"
            disabled={complete.isPending || pause.isPending}
            onClick={handleMarkCompleteClick}
            className="w-full rounded-[4px] bg-primary px-4 py-[10px] text-[13px] font-semibold text-white hover:opacity-85 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Mark Complete
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={pause.isPending || complete.isPending}
              onClick={() => pause.mutate()}
              className="flex items-center justify-center gap-2 rounded-[4px] border border-border-base px-4 py-[9px] text-[13px] font-semibold text-muted hover:text-foreground hover:border-foreground/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <PauseCircle size={14} />
              {pause.isPending ? 'Pausing…' : 'Pause'}
            </button>
            <button
              type="button"
              disabled={pause.isPending || complete.isPending || otherDoctors.length === 0}
              onClick={() => { setReassignDoctorId(''); setShowReassignDialog(true) }}
              title={otherDoctors.length === 0 ? 'No other doctors on duty' : undefined}
              className="flex items-center justify-center gap-2 rounded-[4px] border border-border-base px-4 py-[9px] text-[13px] font-semibold text-muted hover:text-foreground hover:border-foreground/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <UserCheck size={14} />
              Reassign
            </button>
          </div>
        </div>
      )}

      {/* Reassign dialog */}
      {showReassignDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20">
          <div className="w-[340px] rounded-[6px] bg-background border border-border-base shadow-lg p-5 space-y-4">
            <div>
              <p className="text-[14px] font-bold text-foreground">Reassign token</p>
              <p className="mt-0.5 text-[12px] text-muted">
                Select a doctor to transfer {entry.tokenDisplay} — {entry.petName} to.
              </p>
            </div>

            {otherDoctors.length === 0 ? (
              <p className="text-[12px] text-muted text-center py-2">
                No other active doctors at this branch.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-52 overflow-y-auto">
                {otherDoctors.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setReassignDoctorId(d.id)}
                    className={cn(
                      'w-full text-left flex items-center justify-between rounded-[4px] border px-3 py-2.5 text-[13px] font-semibold transition-colors',
                      reassignDoctorId === d.id
                        ? 'border-primary bg-primary/8 text-primary'
                        : 'border-border-base bg-surface text-foreground hover:border-primary/40',
                    )}
                  >
                    {d.name}
                    {reassignDoctorId === d.id && (
                      <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-primary">Selected</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {reassign.isError && (
              <p className="text-[12px] text-danger">
                {(reassign.error as Error)?.message ?? 'Failed to reassign. Try again.'}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                disabled={reassign.isPending}
                onClick={() => setShowReassignDialog(false)}
                className="flex-1 rounded-[4px] border border-border-base px-4 py-[9px] text-[13px] font-semibold text-muted hover:text-foreground transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!reassignDoctorId || reassign.isPending}
                onClick={() => {
                  const doc = otherDoctors.find((d) => d.id === reassignDoctorId)
                  if (doc) reassign.mutate({ doctorId: doc.id, doctorName: doc.name })
                }}
                className="flex-1 rounded-[4px] bg-primary px-4 py-[9px] text-[13px] font-semibold text-white hover:opacity-85 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {reassign.isPending ? 'Reassigning…' : 'Confirm Reassign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Earlier visits modal */}
      {detail && (
        <EarlierVisitsModal
          open={showEarlierVisits}
          visits={detail.earlierVisits}
          clinicId={clinicId}
          branchId={branchId}
          onClose={() => setShowEarlierVisits(false)}
        />
      )}

      {/* Confirmation dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20">
          <div className="w-[360px] rounded-[6px] bg-background border border-border-base shadow-lg p-5 space-y-4">
            <p className="text-[14px] font-bold text-foreground">Confirm complete?</p>
            {selectedServices.length > 0 ? (
              <div className="rounded-[4px] border border-border-base overflow-hidden divide-y divide-border-base">
                {selectedServices.map((s) => (
                  <div key={s.serviceId} className="flex items-center justify-between px-3 py-2 bg-surface gap-2">
                    <span className="flex-1 text-[13px] text-foreground">{s.name}</span>
                    {s.quantity > 1 && (
                      <span className="text-[11px] text-muted tabular-nums">{s.quantity}×</span>
                    )}
                    <span className="text-[13px] font-semibold text-foreground tabular-nums">{formatInr(s.quantity * s.price)}</span>
                  </div>
                ))}
                <div className="flex justify-between px-3 py-2 bg-surface-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">Total</span>
                  <span className="text-[14px] font-bold text-primary tabular-nums">{formatInr(confirmTotal)}</span>
                </div>
              </div>
            ) : (
              <p className="text-[12px] text-muted text-center">No services added.</p>
            )}
            {complete.isError && (
              <p className="text-[12px] text-danger">
                {(complete.error as Error)?.message ?? 'Failed to save. Try again.'}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={complete.isPending}
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-[4px] border border-border-base px-4 py-[9px] text-[13px] font-semibold text-muted hover:text-foreground hover:border-foreground/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={complete.isPending}
                onClick={handleConfirmComplete}
                className="flex-1 rounded-[4px] bg-primary px-4 py-[9px] text-[13px] font-semibold text-white hover:opacity-85 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {complete.isPending ? 'Saving…' : 'Mark Complete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
