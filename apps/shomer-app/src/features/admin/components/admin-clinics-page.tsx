import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Plus, ArrowRight, X } from 'lucide-react'

interface Clinic {
  id: string
  name: string
  logoUrl?: string
  branding?: {
    primaryColor: string
    accentColor: string
    backgroundColor: string
    textColor: string
    tagline?: string
  }
  createdAt?: unknown
}

const SHOMER_DEFAULTS = {
  primaryColor: '#9979FF',
  accentColor: '#FAE8C7',
  backgroundColor: '#FEFAFF',
  textColor: '#1A1825',
}

const labelClass = 'text-[10px] font-semibold uppercase tracking-[0.08em] text-muted'
const inputClass =
  'w-full rounded-[4px] border border-border-base bg-white px-3 py-[9px] text-[13px] text-foreground placeholder:text-muted/60 focus:border-primary focus:outline-none transition-colors'

export function AdminClinicsPage() {
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [tagline, setTagline] = useState('')
  const [primaryColor, setPrimaryColor] = useState(SHOMER_DEFAULTS.primaryColor)
  const [accentColor, setAccentColor] = useState(SHOMER_DEFAULTS.accentColor)
  const [backgroundColor, setBackgroundColor] = useState(SHOMER_DEFAULTS.backgroundColor)
  const [textColor, setTextColor] = useState(SHOMER_DEFAULTS.textColor)

  async function loadClinics() {
    setLoading(true)
    try {
      const snap = await getDocs(collection(db, 'clinics'))
      setClinics(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Clinic)))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClinics()
  }, [])

  function resetForm() {
    setName('')
    setLogoUrl('')
    setTagline('')
    setPrimaryColor(SHOMER_DEFAULTS.primaryColor)
    setAccentColor(SHOMER_DEFAULTS.accentColor)
    setBackgroundColor(SHOMER_DEFAULTS.backgroundColor)
    setTextColor(SHOMER_DEFAULTS.textColor)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    try {
      const data: Record<string, unknown> = {
        name: name.trim(),
        branding: {
          primaryColor,
          accentColor,
          backgroundColor,
          textColor,
          ...(tagline.trim() ? { tagline: tagline.trim() } : {}),
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
      if (logoUrl.trim()) data.logoUrl = logoUrl.trim()

      await addDoc(collection(db, 'clinics'), data)
      resetForm()
      setShowForm(false)
      await loadClinics()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <header className="h-[52px] border-b border-border-base bg-surface flex items-center justify-between px-6 flex-shrink-0">
        <h1 className="font-display text-[18px] font-bold text-foreground leading-none">
          Clinics
        </h1>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-[4px] bg-primary px-3 py-[7px] text-[13px] font-semibold text-white hover:opacity-85 transition-opacity"
          >
            <Plus size={14} />
            Add Clinic
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">

          {/* Add Clinic form */}
          {showForm && (
            <div className="rounded-[4px] border border-border-base bg-surface p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-bold text-foreground">New Clinic</p>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); resetForm() }}
                  className="text-muted hover:text-foreground transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className={labelClass}>Clinic Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Happy Paws Clinic"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className={labelClass}>Logo URL (optional)</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className={labelClass}>Tagline (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Compassionate Care for Your Pets"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div className="space-y-2">
                  <p className={labelClass}>Branding Colors</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted">Primary</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="h-8 w-10 rounded-[3px] border border-border-base cursor-pointer"
                        />
                        <span className="text-[12px] text-muted font-mono">{primaryColor}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted">Accent</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={accentColor}
                          onChange={(e) => setAccentColor(e.target.value)}
                          className="h-8 w-10 rounded-[3px] border border-border-base cursor-pointer"
                        />
                        <span className="text-[12px] text-muted font-mono">{accentColor}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted">Background</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={backgroundColor}
                          onChange={(e) => setBackgroundColor(e.target.value)}
                          className="h-8 w-10 rounded-[3px] border border-border-base cursor-pointer"
                        />
                        <span className="text-[12px] text-muted font-mono">{backgroundColor}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted">Text</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={textColor}
                          onChange={(e) => setTextColor(e.target.value)}
                          className="h-8 w-10 rounded-[3px] border border-border-base cursor-pointer"
                        />
                        <span className="text-[12px] text-muted font-mono">{textColor}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={!name.trim() || submitting}
                    className="flex items-center gap-1.5 rounded-[4px] bg-primary px-4 py-[9px] text-[13px] font-semibold text-white hover:opacity-85 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Creating…' : 'Create Clinic'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); resetForm() }}
                    className="rounded-[4px] border border-border-base px-4 py-[9px] text-[13px] font-semibold text-muted hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Clinics list */}
          {loading ? (
            <p className="text-[13px] text-muted">Loading…</p>
          ) : clinics.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[28px]">🏥</p>
              <p className="text-[13px] font-semibold text-muted mt-2">No clinics yet</p>
            </div>
          ) : (
            <div className="rounded-[4px] border border-border-base overflow-hidden divide-y divide-border-base">
              {clinics.map((clinic) => (
                <Link
                  key={clinic.id}
                  to={`/admin/clinics/${clinic.id}`}
                  className="flex items-center justify-between px-5 py-4 bg-surface hover:bg-surface-2 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {clinic.logoUrl ? (
                      <img
                        src={clinic.logoUrl}
                        alt={clinic.name}
                        className="h-8 w-8 rounded-[4px] object-contain flex-shrink-0 bg-white"
                      />
                    ) : (
                      <div
                        className="h-8 w-8 rounded-[4px] flex items-center justify-center flex-shrink-0 text-white text-[13px] font-bold"
                        style={{ backgroundColor: clinic.branding?.primaryColor ?? '#9979FF' }}
                      >
                        {clinic.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-foreground truncate">{clinic.name}</p>
                      {clinic.branding?.tagline && (
                        <p className="text-[11px] text-muted truncate">{clinic.branding.tagline}</p>
                      )}
                    </div>
                  </div>
                  <ArrowRight size={15} className="text-muted group-hover:text-primary transition-colors flex-shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
