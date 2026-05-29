import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NewOwnerFormData } from '../types'
import { useBreeds } from '../services/use-breeds'
import { BreedSelect } from './breed-select'

const SPECIES_OPTIONS: { value: NewOwnerFormData['species']; label: string }[] = [
  { value: 'dog', label: 'Dog' },
  { value: 'cat', label: 'Cat' },
  { value: 'other', label: 'Other' },
]

const GENDER_OPTIONS: { value: 'male' | 'female'; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ── RegisterOwnerStep ─────────────────────────────────────────────────────────

interface RegisterOwnerStepProps {
  prefillPetName?: string
  prefillBreed?: string
  prefillSpecies?: NewOwnerFormData['species']
  prefillPhone?: string // full E.164 e.g. "+919876543210"
  onSubmit: (data: NewOwnerFormData) => void
  onBack: () => void
}

type FormErrors = Partial<Record<keyof NewOwnerFormData, string>>

export function RegisterOwnerStep({
  prefillPetName = '',
  prefillBreed = '',
  prefillSpecies = 'dog',
  prefillPhone = '',
  onSubmit,
  onBack,
}: RegisterOwnerStepProps) {
  const [form, setForm] = useState<NewOwnerFormData>({
    ownerName: '',
    phone: prefillPhone || '+91',
    altPhone: '+91',
    email: '',
    petName: prefillPetName,
    species: prefillSpecies,
    speciesName: '',
    breed: prefillBreed,
    gender: '',
    dateOfBirth: '',
    color: '',
    microchipNumber: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})

  const breeds = useBreeds(form.species)

  function set<K extends keyof NewOwnerFormData>(key: K, value: NewOwnerFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  // Phone — store as "+91{digits}", input shows only the 10-digit part
  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
    setForm((prev) => ({ ...prev, phone: '+91' + digits }))
    setErrors((prev) => ({ ...prev, phone: undefined }))
  }

  function handlePhoneBlur() {
    const digits = form.phone.slice(3)
    if (digits.length > 0 && digits.length !== 10) {
      setErrors((prev) => ({ ...prev, phone: 'Phone number must be 10 digits' }))
    }
  }

  function handleAltPhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
    setForm((prev) => ({ ...prev, altPhone: '+91' + digits }))
    setErrors((prev) => ({ ...prev, altPhone: undefined }))
  }

  function handleAltPhoneBlur() {
    const digits = form.altPhone.slice(3)
    if (digits.length > 0 && digits.length !== 10) {
      setErrors((prev) => ({ ...prev, altPhone: 'Must be 10 digits' }))
    }
  }

  function handleEmailBlur() {
    if (form.email && !EMAIL_RE.test(form.email)) {
      setErrors((prev) => ({ ...prev, email: 'Enter a valid email address' }))
    }
  }

  function handleMicrochipBlur() {
    if (form.microchipNumber.length > 15) {
      setErrors((prev) => ({ ...prev, microchipNumber: 'Maximum 15 characters' }))
    }
  }

  function validate(): boolean {
    const next: FormErrors = {}
    if (!form.ownerName.trim()) next.ownerName = 'Required'
    if (form.phone === '+91' || form.phone.length === 3) {
      next.phone = 'Required'
    } else if (form.phone.slice(3).length !== 10) {
      next.phone = 'Phone number must be 10 digits'
    }
    if (form.email && !EMAIL_RE.test(form.email)) next.email = 'Enter a valid email address'
    if (form.altPhone !== '+91' && form.altPhone.slice(3).length !== 10) {
      next.altPhone = 'Must be 10 digits'
    }
    if (!form.petName.trim()) next.petName = 'Required'
    if (form.species === 'other' && !form.speciesName.trim()) next.speciesName = 'Required'
    if (!form.gender) next.gender = 'Required'
    if (form.microchipNumber.length > 15) next.microchipNumber = 'Maximum 15 characters'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (validate()) onSubmit(form)
  }

  function inputClass(field: keyof NewOwnerFormData) {
    return cn(
      'w-full rounded-[4px] border bg-white px-3 py-[9px] text-[13px] font-medium text-foreground placeholder:text-muted focus:border-primary focus:outline-none transition-colors',
      errors[field] ? 'border-danger' : 'border-border-base',
    )
  }

  const breedPlaceholder =
    form.species === 'dog' ? 'e.g. Golden Retriever' : 'e.g. Persian'

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
          {/* Phone */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
              Phone <span className="text-danger">*</span>
            </label>
            <div
              className={cn(
                'flex items-center rounded-[4px] border overflow-hidden transition-colors',
                errors.phone ? 'border-danger' : 'border-border-base',
              )}
            >
              <span className="flex-shrink-0 select-none border-r border-border-base bg-surface-2 px-3 py-[9px] text-[13px] font-semibold text-muted">
                +91
              </span>
              <input
                type="tel"
                placeholder="98765 43210"
                value={form.phone.slice(3)}
                onChange={handlePhoneChange}
                onBlur={handlePhoneBlur}
                inputMode="numeric"
                className="flex-1 bg-white px-3 py-[9px] text-[13px] font-medium text-foreground placeholder:text-muted focus:outline-none"
              />
            </div>
            {errors.phone && (
              <p className="text-[11px] text-danger">{errors.phone}</p>
            )}
          </div>

          {/* Alt Phone */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
              Alt. Phone
            </label>
            <div
              className={cn(
                'flex items-center rounded-[4px] border overflow-hidden transition-colors',
                errors.altPhone ? 'border-danger' : 'border-border-base',
              )}
            >
              <span className="flex-shrink-0 select-none border-r border-border-base bg-surface-2 px-3 py-[9px] text-[13px] font-semibold text-muted">
                +91
              </span>
              <input
                type="tel"
                placeholder="98765 43210"
                value={form.altPhone.slice(3)}
                onChange={handleAltPhoneChange}
                onBlur={handleAltPhoneBlur}
                inputMode="numeric"
                className="flex-1 bg-white px-3 py-[9px] text-[13px] font-medium text-foreground placeholder:text-muted focus:outline-none"
              />
            </div>
            {errors.altPhone && (
              <p className="text-[11px] text-danger">{errors.altPhone}</p>
            )}
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
            Email
          </label>
          <input
            type="text"
            placeholder="owner@email.com"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            onBlur={handleEmailBlur}
            className={inputClass('email')}
          />
          {errors.email && (
            <p className="text-[11px] text-danger">{errors.email}</p>
          )}
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

        {/* Species toggle */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
            Species <span className="text-danger">*</span>
          </label>
          <div className="grid grid-cols-3 rounded-[4px] border border-border-base overflow-hidden">
            {SPECIES_OPTIONS.map((opt, i) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  set('species', opt.value)
                  if (opt.value !== 'other') set('speciesName', '')
                  set('breed', '')
                }}
                className={cn(
                  'py-[9px] text-[13px] font-semibold transition-colors',
                  i < SPECIES_OPTIONS.length - 1 && 'border-r border-border-base',
                  form.species === opt.value
                    ? 'bg-primary text-white'
                    : 'bg-surface text-muted hover:bg-surface-2 hover:text-foreground',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom species name */}
        {form.species === 'other' && (
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
              Species Name <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Hamster, Parrot, Turtle…"
              value={form.speciesName}
              onChange={(e) => set('speciesName', e.target.value)}
              className={inputClass('speciesName')}
              autoFocus
            />
            {errors.speciesName && (
              <p className="text-[11px] text-danger">{errors.speciesName}</p>
            )}
          </div>
        )}

        {/* Gender */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
            Gender <span className="text-danger">*</span>
          </label>
          <div
            className={cn(
              'grid grid-cols-2 rounded-[4px] border overflow-hidden',
              errors.gender ? 'border-danger' : 'border-border-base',
            )}
          >
            {GENDER_OPTIONS.map((opt, i) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => set('gender', opt.value)}
                className={cn(
                  'py-[9px] text-[13px] font-semibold transition-colors',
                  i < GENDER_OPTIONS.length - 1 && 'border-r border-border-base',
                  form.gender === opt.value
                    ? 'bg-primary text-white'
                    : 'bg-surface text-muted hover:bg-surface-2 hover:text-foreground',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {errors.gender && (
            <p className="text-[11px] text-danger">{errors.gender}</p>
          )}
        </div>

        {/* Breed + Age */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
              Breed
            </label>
            {form.species !== 'other' ? (
              <BreedSelect
                value={form.breed}
                onChange={(v) => set('breed', v)}
                breeds={breeds}
                placeholder={breedPlaceholder}
                hasError={!!errors.breed}
              />
            ) : (
              <input
                type="text"
                placeholder="e.g. Mix, Dwarf…"
                value={form.breed}
                onChange={(e) => set('breed', e.target.value)}
                className={inputClass('breed')}
              />
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
              Date of Birth
            </label>
            <input
              type="date"
              max={new Date().toISOString().split('T')[0]}
              value={form.dateOfBirth}
              onChange={(e) => set('dateOfBirth', e.target.value)}
              className={inputClass('dateOfBirth')}
            />
          </div>
        </div>

        {/* Color */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
            Color / Markings
          </label>
          <input
            type="text"
            placeholder="e.g. Golden, Black & White…"
            value={form.color}
            onChange={(e) => set('color', e.target.value)}
            className={inputClass('color')}
          />
        </div>

        {/* Microchip */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
            Microchip No.
          </label>
          <input
            type="text"
            placeholder="15-digit chip number"
            value={form.microchipNumber}
            onChange={(e) => set('microchipNumber', e.target.value)}
            maxLength={15}
            onBlur={handleMicrochipBlur}
            className={inputClass('microchipNumber')}
          />
          {errors.microchipNumber && (
            <p className="text-[11px] text-danger">{errors.microchipNumber}</p>
          )}
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
