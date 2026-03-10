import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import type { NewOwnerFormData } from '../types'

const SPECIES_OPTIONS: { value: NewOwnerFormData['species']; label: string }[] = [
  { value: 'dog', label: 'Dog' },
  { value: 'cat', label: 'Cat' },
  { value: 'bird', label: 'Bird' },
  { value: 'rabbit', label: 'Rabbit' },
  { value: 'other', label: 'Other' },
]

interface RegisterOwnerStepProps {
  prefillPhone?: string
  prefillEmail?: string
  onSubmit: (data: NewOwnerFormData) => void
  onBack: () => void
}

export function RegisterOwnerStep({
  prefillPhone = '',
  prefillEmail = '',
  onSubmit,
  onBack,
}: RegisterOwnerStepProps) {
  const [form, setForm] = useState<NewOwnerFormData>({
    ownerName: '',
    phone: prefillPhone,
    email: prefillEmail,
    petName: '',
    species: 'dog',
    breed: '',
    age: '',
    microchipNumber: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof NewOwnerFormData, string>>>({})

  function set<K extends keyof NewOwnerFormData>(key: K, value: NewOwnerFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function validate(): boolean {
    const next: typeof errors = {}
    if (!form.ownerName.trim()) next.ownerName = 'Required'
    if (!form.phone.trim()) next.phone = 'Required'
    if (!form.petName.trim()) next.petName = 'Required'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (validate()) onSubmit(form)
  }

  function inputClass(field: keyof NewOwnerFormData) {
    return `w-full rounded-[4px] border ${errors[field] ? 'border-danger' : 'border-border-base'} bg-white px-3 py-[9px] text-[13px] font-medium text-foreground placeholder:text-muted focus:border-primary focus:outline-none transition-colors`
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} />
        Back to search
      </button>

      {/* Owner fields */}
      <div className="space-y-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
          Owner Details
        </p>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
            Name <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            placeholder="Full name"
            value={form.ownerName}
            onChange={(e) => set('ownerName', e.target.value)}
            className={inputClass('ownerName')}
          />
          {errors.ownerName && (
            <p className="text-[11px] text-danger">{errors.ownerName}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
              Phone <span className="text-danger">*</span>
            </label>
            <input
              type="tel"
              placeholder="+91 98765 43210"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              className={inputClass('phone')}
            />
            {errors.phone && (
              <p className="text-[11px] text-danger">{errors.phone}</p>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
              Email
            </label>
            <input
              type="email"
              placeholder="owner@email.com"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              className={inputClass('email')}
            />
          </div>
        </div>
      </div>

      {/* Pet fields */}
      <div className="space-y-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
          Pet Details
        </p>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
            Pet Name <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            placeholder="Pet's name"
            value={form.petName}
            onChange={(e) => set('petName', e.target.value)}
            className={inputClass('petName')}
          />
          {errors.petName && (
            <p className="text-[11px] text-danger">{errors.petName}</p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
              Species
            </label>
            <select
              value={form.species}
              onChange={(e) => set('species', e.target.value as NewOwnerFormData['species'])}
              className="w-full rounded-[4px] border border-border-base bg-white px-3 py-[9px] text-[13px] font-medium text-foreground focus:border-primary focus:outline-none transition-colors"
            >
              {SPECIES_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
              Breed
            </label>
            <input
              type="text"
              placeholder="Optional"
              value={form.breed}
              onChange={(e) => set('breed', e.target.value)}
              className={inputClass('breed')}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
              Age (years)
            </label>
            <input
              type="number"
              min="0"
              placeholder="e.g. 3"
              value={form.age}
              onChange={(e) => set('age', e.target.value)}
              className={inputClass('age')}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
            Microchip No.
          </label>
          <input
            type="text"
            placeholder="15-digit chip number (if available)"
            value={form.microchipNumber}
            onChange={(e) => set('microchipNumber', e.target.value)}
            className={inputClass('microchipNumber')}
          />
        </div>
      </div>

      <button
        type="submit"
        className="w-full rounded-[4px] bg-primary px-4 py-[9px] text-[13px] font-semibold text-white hover:opacity-85 transition-opacity"
      >
        Continue to Check-in
      </button>
    </form>
  )
}
