import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { GitBranch, Stethoscope, Users, BookOpen } from 'lucide-react'

interface ClinicBranding {
  primaryColor: string
  accentColor: string
  backgroundColor: string
  textColor: string
  tagline?: string
}

interface Clinic {
  id: string
  name: string
  logoUrl?: string
  branding?: ClinicBranding
}

const SHOMER_DEFAULTS: ClinicBranding = {
  primaryColor: '#9979FF',
  accentColor: '#FAE8C7',
  backgroundColor: '#FEFAFF',
  textColor: '#1A1825',
}

const labelClass = 'text-[10px] font-semibold uppercase tracking-[0.08em] text-muted'
const inputClass =
  'w-full rounded-[4px] border border-border-base bg-white px-3 py-[9px] text-[13px] text-foreground placeholder:text-muted/60 focus:border-primary focus:outline-none transition-colors'

export function AdminClinicDetailPage() {
  const { id: clinicId } = useParams<{ id: string }>()
  const [clinic, setClinic] = useState<Clinic | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Editable fields
  const [logoUrl, setLogoUrl] = useState('')
  const [tagline, setTagline] = useState('')
  const [primaryColor, setPrimaryColor] = useState(SHOMER_DEFAULTS.primaryColor)
  const [accentColor, setAccentColor] = useState(SHOMER_DEFAULTS.accentColor)
  const [backgroundColor, setBackgroundColor] = useState(SHOMER_DEFAULTS.backgroundColor)
  const [textColor, setTextColor] = useState(SHOMER_DEFAULTS.textColor)

  useEffect(() => {
    if (!clinicId) return
    setLoading(true)
    getDoc(doc(db, `clinics/${clinicId}`)).then((snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as Clinic
        setClinic(data)
        setLogoUrl(data.logoUrl ?? '')
        setTagline(data.branding?.tagline ?? '')
        setPrimaryColor(data.branding?.primaryColor ?? SHOMER_DEFAULTS.primaryColor)
        setAccentColor(data.branding?.accentColor ?? SHOMER_DEFAULTS.accentColor)
        setBackgroundColor(data.branding?.backgroundColor ?? SHOMER_DEFAULTS.backgroundColor)
        setTextColor(data.branding?.textColor ?? SHOMER_DEFAULTS.textColor)
      }
      setLoading(false)
    })
  }, [clinicId])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!clinicId) return
    setSaving(true)
    try {
      const updates: Record<string, unknown> = {
        branding: {
          primaryColor,
          accentColor,
          backgroundColor,
          textColor,
          ...(tagline.trim() ? { tagline: tagline.trim() } : {}),
        },
        updatedAt: serverTimestamp(),
      }
      if (logoUrl.trim()) updates.logoUrl = logoUrl.trim()

      await updateDoc(doc(db, `clinics/${clinicId}`), updates)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-1 h-full">
        <p className="text-[13px] text-muted">Loading…</p>
      </div>
    )
  }

  if (!clinic) {
    return (
      <div className="flex items-center justify-center flex-1 h-full">
        <p className="text-[13px] text-danger">Clinic not found.</p>
      </div>
    )
  }

  const contextLinks = [
    { to: `/admin/clinics/${clinicId}/branches`, label: 'Branches', Icon: GitBranch },
    { to: `/admin/clinics/${clinicId}/doctors`, label: 'Doctors', Icon: Stethoscope },
    { to: `/admin/clinics/${clinicId}/staff`, label: 'Staff', Icon: Users },
    { to: `/admin/clinics/${clinicId}/catalogs`, label: 'Catalogs', Icon: BookOpen },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <header className="h-[52px] border-b border-border-base bg-surface flex items-center px-6 flex-shrink-0">
        <h1 className="font-display text-[18px] font-bold text-foreground leading-none">
          {clinic.name}
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">

          {/* Quick nav to sub-sections */}
          <div className="grid grid-cols-2 gap-3">
            {contextLinks.map(({ to, label, Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-3 px-4 py-3 rounded-[4px] border border-border-base bg-surface hover:bg-surface-2 transition-colors"
              >
                <Icon size={15} className="text-primary flex-shrink-0" />
                <span className="text-[13px] font-semibold text-foreground">{label}</span>
              </Link>
            ))}
          </div>

          {/* Branding form */}
          <div>
            <p className={labelClass + ' mb-4'}>Branding & Settings</p>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <label className={labelClass}>Logo URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="space-y-1.5">
                <label className={labelClass}>Tagline</label>
                <input
                  type="text"
                  placeholder="e.g. Compassionate Care for Your Pets"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="space-y-2">
                <p className={labelClass}>Colors</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Primary', value: primaryColor, setter: setPrimaryColor },
                    { label: 'Accent', value: accentColor, setter: setAccentColor },
                    { label: 'Background', value: backgroundColor, setter: setBackgroundColor },
                    { label: 'Text', value: textColor, setter: setTextColor },
                  ].map(({ label, value, setter }) => (
                    <div key={label} className="space-y-1">
                      <label className="text-[11px] text-muted">{label}</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={value}
                          onChange={(e) => setter(e.target.value)}
                          className="h-8 w-10 rounded-[3px] border border-border-base cursor-pointer"
                        />
                        <span className="text-[12px] text-muted font-mono">{value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-[4px] bg-primary px-4 py-[9px] text-[13px] font-semibold text-white hover:opacity-85 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                {saved && (
                  <span className="text-[12px] font-semibold text-success">Saved!</span>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
