import { useState } from 'react'
import { Plus, Trash2, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useClinic } from '@/features/clinic'
import { useDutyRoster } from '../services/use-duty-roster'
import { setDoctorOnDuty } from '../services/duty-roster-service'
import { useDoctors } from '@/features/checkin/services/use-doctors'
import {
  useAllClinicDiagnoses,
  useAllClinicMedicines,
  useAllClinicServices,
} from '../services/use-settings-lists'
import {
  addClinicDiagnosis,
  setClinicDiagnosisActive,
  addClinicMedicine,
  setClinicMedicineActive,
  addClinicService,
  setClinicServiceActive,
} from '../services/clinic-lists-service'

type Tab = 'duty' | 'diagnoses' | 'medicines' | 'services'

const labelClass = 'text-[10px] font-semibold uppercase tracking-[0.08em] text-muted'
const inputClass =
  'flex-1 rounded-[4px] border border-border-base bg-white px-3 py-[9px] text-[13px] text-foreground placeholder:text-muted/60 focus:border-primary focus:outline-none transition-colors'

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`
}

// ── Doctors on Duty Tab ───────────────────────────────────────────────────────

function DoctorsOnDutyTab({ clinicId, branchId }: { clinicId: string; branchId: string }) {
  const { data: doctors = [], isLoading } = useDoctors(clinicId, branchId)
  const { onDuty, loading: rosterLoading } = useDutyRoster(clinicId, branchId)
  const [toggling, setToggling] = useState<string | null>(null)

  async function handleToggle(doctorId: string, currentlyOn: boolean) {
    setToggling(doctorId)
    try {
      await setDoctorOnDuty(clinicId, branchId, doctorId, !currentlyOn, onDuty)
    } finally {
      setToggling(null)
    }
  }

  const loading = isLoading || rosterLoading

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className={labelClass}>Today's Roster</p>
        <p className="text-[12px] text-muted">
          Toggle doctors on or off for today. Resets automatically at midnight.
        </p>
      </div>

      {loading ? (
        <p className="text-[12px] text-muted">Loading…</p>
      ) : doctors.length === 0 ? (
        <p className="text-[12px] text-muted">No active doctors found for this branch.</p>
      ) : (
        <div className="rounded-[4px] border border-border-base overflow-hidden divide-y divide-border-base">
          {doctors.map((doctor) => {
            const isOn = onDuty.includes(doctor.id)
            const isToggling = toggling === doctor.id

            return (
              <div
                key={doctor.id}
                className="flex items-center justify-between px-4 py-3.5 bg-surface"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-[12px] font-bold text-primary">
                      {doctor.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-foreground">{doctor.name}</p>
                    {isOn && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-success flex-shrink-0" />
                        <span className="text-[10px] font-medium text-muted">On duty</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Toggle */}
                <button
                  type="button"
                  disabled={isToggling}
                  onClick={() => handleToggle(doctor.id, isOn)}
                  aria-checked={isOn}
                  role="switch"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault()
                      handleToggle(doctor.id, isOn)
                    }
                  }}
                  className={cn(
                    'relative h-5 w-9 rounded-full transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50',
                    isOn ? 'bg-success' : 'bg-border-base',
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform',
                      isOn && 'translate-x-4',
                    )}
                  />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {onDuty.length > 0 && (
        <p className="text-[11px] text-muted">
          {onDuty.length} doctor{onDuty.length !== 1 ? 's' : ''} on duty today.
        </p>
      )}
    </div>
  )
}

// ── Diagnoses Tab ─────────────────────────────────────────────────────────────

function DiagnosesTab({ clinicId }: { clinicId: string }) {
  const { items, loading } = useAllClinicDiagnoses(clinicId)
  const [name, setName] = useState('')
  const [adding, setAdding] = useState(false)
  const [filter, setFilter] = useState('')

  const filtered = items.filter((i) => i.name.toLowerCase().includes(filter.toLowerCase()))

  async function handleAdd() {
    const trimmed = name.trim()
    if (!trimmed) return
    setAdding(true)
    try {
      await addClinicDiagnosis(clinicId, trimmed)
      setName('')
    } finally {
      setAdding(false)
    }
  }

  async function toggle(id: string, current: boolean) {
    await setClinicDiagnosisActive(clinicId, id, !current)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className={labelClass}>Add Diagnosis</p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. Parvovirus, Skin allergy…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className={inputClass}
          />
          <button
            type="button"
            disabled={!name.trim() || adding}
            onClick={handleAdd}
            className="flex items-center gap-1.5 rounded-[4px] bg-primary px-3 py-[9px] text-[13px] font-semibold text-white hover:opacity-85 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={14} />
            Add
          </button>
        </div>
      </div>

      {items.length > 6 && (
        <input
          type="text"
          placeholder="Filter list…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className={cn(inputClass, 'w-full')}
        />
      )}

      {loading ? (
        <p className="text-[12px] text-muted">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-[12px] text-muted">No diagnoses added yet.</p>
      ) : (
        <div className="rounded-[4px] border border-border-base overflow-hidden divide-y divide-border-base">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={cn('flex items-center justify-between px-4 py-3 bg-surface transition-colors', !item.isActive && 'opacity-40')}
            >
              <span className={cn('text-[13px] text-foreground', !item.isActive && 'line-through text-muted')}>
                {item.name}
              </span>
              <button
                type="button"
                onClick={() => toggle(item.id, item.isActive)}
                className={cn(
                  'flex items-center gap-1.5 rounded-[3px] px-2.5 py-1 text-[11px] font-semibold transition-colors',
                  item.isActive ? 'text-danger hover:bg-danger/10' : 'text-success hover:bg-success/10',
                )}
              >
                {item.isActive ? <><Trash2 size={11} /> Remove</> : <><RotateCcw size={11} /> Restore</>}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Medicines Tab ─────────────────────────────────────────────────────────────

function MedicinesTab({ clinicId }: { clinicId: string }) {
  const { items, loading } = useAllClinicMedicines(clinicId)
  const [name, setName] = useState('')
  const [adding, setAdding] = useState(false)
  const [filter, setFilter] = useState('')

  const filtered = items.filter((i) => i.name.toLowerCase().includes(filter.toLowerCase()))

  async function handleAdd() {
    const trimmed = name.trim()
    if (!trimmed) return
    setAdding(true)
    try {
      await addClinicMedicine(clinicId, trimmed)
      setName('')
    } finally {
      setAdding(false)
    }
  }

  async function toggle(id: string, current: boolean) {
    await setClinicMedicineActive(clinicId, id, !current)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className={labelClass}>Add Medicine</p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. Amoxicillin 250mg, Metronidazole…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className={inputClass}
          />
          <button
            type="button"
            disabled={!name.trim() || adding}
            onClick={handleAdd}
            className="flex items-center gap-1.5 rounded-[4px] bg-primary px-3 py-[9px] text-[13px] font-semibold text-white hover:opacity-85 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={14} />
            Add
          </button>
        </div>
      </div>

      {items.length > 6 && (
        <input
          type="text"
          placeholder="Filter list…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className={cn(inputClass, 'w-full')}
        />
      )}

      {loading ? (
        <p className="text-[12px] text-muted">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-[12px] text-muted">No medicines added yet.</p>
      ) : (
        <div className="rounded-[4px] border border-border-base overflow-hidden divide-y divide-border-base">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={cn('flex items-center justify-between px-4 py-3 bg-surface', !item.isActive && 'opacity-40')}
            >
              <span className={cn('text-[13px] text-foreground', !item.isActive && 'line-through text-muted')}>
                {item.name}
              </span>
              <button
                type="button"
                onClick={() => toggle(item.id, item.isActive)}
                className={cn(
                  'flex items-center gap-1.5 rounded-[3px] px-2.5 py-1 text-[11px] font-semibold transition-colors',
                  item.isActive ? 'text-danger hover:bg-danger/10' : 'text-success hover:bg-success/10',
                )}
              >
                {item.isActive ? <><Trash2 size={11} /> Remove</> : <><RotateCcw size={11} /> Restore</>}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Services Tab ──────────────────────────────────────────────────────────────

function ServicesTab({ clinicId }: { clinicId: string }) {
  const { items, loading } = useAllClinicServices(clinicId)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [adding, setAdding] = useState(false)
  const [filter, setFilter] = useState('')

  const filtered = items.filter((i) => i.name.toLowerCase().includes(filter.toLowerCase()))

  async function handleAdd() {
    const trimmedName = name.trim()
    const parsedPrice = parseFloat(price)
    if (!trimmedName || isNaN(parsedPrice) || parsedPrice < 0) return
    setAdding(true)
    try {
      await addClinicService(clinicId, trimmedName, parsedPrice)
      setName('')
      setPrice('')
    } finally {
      setAdding(false)
    }
  }

  async function toggle(id: string, current: boolean) {
    await setClinicServiceActive(clinicId, id, !current)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className={labelClass}>Add Service</p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Service name…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
          <div className="relative flex-shrink-0">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted">₹</span>
            <input
              type="number"
              min={0}
              placeholder="Price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="w-28 rounded-[4px] border border-border-base bg-white pl-6 pr-3 py-[9px] text-[13px] text-foreground placeholder:text-muted/60 focus:border-primary focus:outline-none transition-colors"
            />
          </div>
          <button
            type="button"
            disabled={!name.trim() || !price || adding}
            onClick={handleAdd}
            className="flex items-center gap-1.5 rounded-[4px] bg-primary px-3 py-[9px] text-[13px] font-semibold text-white hover:opacity-85 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={14} />
            Add
          </button>
        </div>
      </div>

      {items.length > 6 && (
        <input
          type="text"
          placeholder="Filter list…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className={cn(inputClass, 'w-full')}
        />
      )}

      {loading ? (
        <p className="text-[12px] text-muted">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-[12px] text-muted">No services added yet.</p>
      ) : (
        <div className="rounded-[4px] border border-border-base overflow-hidden divide-y divide-border-base">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={cn('flex items-center justify-between px-4 py-3 bg-surface', !item.isActive && 'opacity-40')}
            >
              <div className="flex items-center gap-4">
                <span className={cn('text-[13px] text-foreground', !item.isActive && 'line-through text-muted')}>
                  {item.name}
                </span>
                <span className="text-[12px] font-semibold text-muted">{formatInr(item.price)}</span>
              </div>
              <button
                type="button"
                onClick={() => toggle(item.id, item.isActive)}
                className={cn(
                  'flex items-center gap-1.5 rounded-[3px] px-2.5 py-1 text-[11px] font-semibold transition-colors',
                  item.isActive ? 'text-danger hover:bg-danger/10' : 'text-success hover:bg-success/10',
                )}
              >
                {item.isActive ? <><Trash2 size={11} /> Remove</> : <><RotateCcw size={11} /> Restore</>}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const { clinicId, branchId, loading: clinicLoading, error: clinicError } = useClinic()
  const [activeTab, setActiveTab] = useState<Tab>('duty')

  if (clinicLoading) {
    return (
      <div className="flex items-center justify-center flex-1 h-full">
        <p className="text-[13px] text-muted">Loading…</p>
      </div>
    )
  }

  if (clinicError || !clinicId || !branchId) {
    return (
      <div className="flex items-center justify-center flex-1 h-full">
        <p className="text-[13px] text-danger">{clinicError ?? 'Clinic profile not found.'}</p>
      </div>
    )
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'duty', label: 'Doctors on Duty' },
    { key: 'diagnoses', label: 'Diagnoses' },
    { key: 'medicines', label: 'Medicines' },
    { key: 'services', label: 'Services' },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <header className="h-[52px] border-b border-border-base bg-surface flex items-center px-6 flex-shrink-0">
        <h1 className="font-display text-[18px] font-bold text-foreground leading-none">
          Settings
        </h1>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
          {/* Tab bar */}
          <div className="flex gap-1 border-b border-border-base">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'px-4 py-2.5 text-[13px] font-semibold transition-colors border-b-2 -mb-px',
                  activeTab === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted hover:text-foreground',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'duty' && (
            <DoctorsOnDutyTab clinicId={clinicId} branchId={branchId} />
          )}
          {activeTab === 'diagnoses' && <DiagnosesTab clinicId={clinicId} />}
          {activeTab === 'medicines' && <MedicinesTab clinicId={clinicId} />}
          {activeTab === 'services' && <ServicesTab clinicId={clinicId} />}
        </div>
      </div>
    </div>
  )
}
