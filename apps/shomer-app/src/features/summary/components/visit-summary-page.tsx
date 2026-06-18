import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { collection, doc, getDoc, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getAgeFromDob } from '@/lib/age'

// ── Types ──────────────────────────────────────────────────────────────────────

interface ClinicBranding {
  primaryColor: string
  accentColor: string
  backgroundColor: string
  textColor: string
  tagline?: string
}

interface ClinicData {
  name: string
  logoUrl?: string
  branding?: ClinicBranding
}

interface BranchData {
  name: string
  address?: string
  phone?: string
}

interface ServiceEntry {
  serviceId?: string
  name: string
  price: number
  quantity?: number
}

interface PaymentEntry {
  method: 'cash' | 'card' | 'upi'
  amount: number
}

interface VisitData {
  petName: string
  petId?: string
  petSpecies?: string
  ownerName: string
  ownerPhone?: string
  ownerId?: string
  doctorId?: string
  doctorName?: string
  tokenDisplay?: string
  consultationNotes?: string
  date?: string
  createdAt?: { toDate?: () => Date; seconds?: number }
  status?: string
  services?: ServiceEntry[]
  billAmount?: number
  payments?: PaymentEntry[]
  petWeightKg?: number
}

interface PetData {
  breed?: string
  dateOfBirth?: string
  color?: string
  species?: string
  speciesName?: string
}

interface DiagnosisItem {
  name: string
  notes?: string
}

interface PrescriptionItem {
  name: string
  morning: boolean
  afternoon: boolean
  evening: boolean
  night: boolean
  days: number
  mealTiming?: 'before' | 'after'
}

interface VaccineItem {
  name: string
  batch?: string
  nextDue?: string
}

interface DoctorData {
  name?: string
  specialization?: string
}

interface SummaryData {
  clinic: ClinicData
  branch: BranchData
  visit: VisitData
  pet: PetData | null
  doctor: DoctorData | null
  diagnoses: DiagnosisItem[]
  prescriptions: PrescriptionItem[]
  vaccines: VaccineItem[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const DEFAULTS: ClinicBranding = {
  primaryColor: '#9979FF',
  accentColor: '#FAE8C7',
  backgroundColor: '#FEFAFF',
  textColor: '#1A1825',
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  upi: 'UPI',
}

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`
}

function formatVisitDate(visit: VisitData): string {
  try {
    if (visit.date) {
      // If it's a YYYY-MM-DD string
      const d = new Date(visit.date)
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      }
    }
    if (visit.createdAt) {
      const ts = visit.createdAt
      const d = typeof ts.toDate === 'function'
        ? ts.toDate()
        : ts.seconds
          ? new Date(ts.seconds * 1000)
          : null
      if (d) return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    }
  } catch {
    // fallback below
  }
  return '—'
}

// ── Loading / Error states ─────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: DEFAULTS.backgroundColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Quicksand, sans-serif',
        color: DEFAULTS.textColor,
        fontSize: '14px',
      }}
    >
      Loading summary…
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: DEFAULTS.backgroundColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Quicksand, sans-serif',
        color: '#c0392b',
        fontSize: '14px',
        padding: '24px',
        textAlign: 'center',
      }}
    >
      {message}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export function VisitSummaryPage() {
  const { visitId } = useParams<{ visitId: string }>()
  const [searchParams] = useSearchParams()
  const clinicId = searchParams.get('clinicId')
  const branchId = searchParams.get('branchId')

  const [data, setData] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!visitId || !clinicId || !branchId) {
      setError('Invalid summary link. Missing visit, clinic, or branch information.')
      setLoading(false)
      return
    }

    const visitBase = `clinics/${clinicId}/branches/${branchId}/visits/${visitId}`

    Promise.all([
      getDoc(doc(db, `clinics/${clinicId}`)),
      getDoc(doc(db, `clinics/${clinicId}/branches/${branchId}`)),
      getDoc(doc(db, visitBase)),
      getDocs(collection(db, `${visitBase}/diagnoses`)),
      getDocs(collection(db, `${visitBase}/prescriptions`)),
      getDocs(collection(db, `${visitBase}/vaccines`)),
    ])
      .then(async ([clinicSnap, branchSnap, visitSnap, diagSnap, presSnap, vacSnap]) => {
        if (!visitSnap.exists()) {
          setError('Visit not found. The link may be invalid or expired.')
          setLoading(false)
          return
        }

        const clinicRaw = clinicSnap.exists() ? clinicSnap.data() : {}
        const branchRaw = branchSnap.exists() ? branchSnap.data() : {}
        const visitRaw = visitSnap.data() as VisitData

        // Fetch doctor and pet docs in parallel if IDs are present
        let doctorData: DoctorData | null = null
        let petData: PetData | null = null

        await Promise.all([
          visitRaw.doctorId
            ? getDoc(doc(db, `clinics/${clinicId}/doctors/${visitRaw.doctorId}`))
                .then((s) => { if (s.exists()) doctorData = s.data() as DoctorData })
                .catch(() => {})
            : Promise.resolve(),
          visitRaw.petId
            ? getDoc(doc(db, `clinics/${clinicId}/pets/${visitRaw.petId}`))
                .then((s) => { if (s.exists()) petData = s.data() as PetData })
                .catch(() => {})
            : Promise.resolve(),
        ])

        // Fetch owner phone from petOwners if not embedded in visit doc (sequential — needs visitRaw.ownerId)
        let ownerPhone = visitRaw.ownerPhone
        if (!ownerPhone && visitRaw.ownerId) {
          try {
            const ownerSnap = await getDoc(doc(db, `clinics/${clinicId}/petOwners/${visitRaw.ownerId}`))
            if (ownerSnap.exists()) {
              ownerPhone = (ownerSnap.data().phone as string) ?? undefined
            }
          } catch {
            // owner phone optional — ignore
          }
        }

        setData({
          clinic: {
            name: (clinicRaw.name as string) ?? 'Clinic',
            logoUrl: (clinicRaw.logoUrl as string) ?? undefined,
            branding: (clinicRaw.branding as ClinicBranding) ?? undefined,
          },
          branch: {
            name: (branchRaw.name as string) ?? '',
            address: (branchRaw.address as string) ?? undefined,
            phone: (branchRaw.phone as string) ?? undefined,
          },
          visit: { ...visitRaw, ownerPhone },
          pet: petData,
          doctor: doctorData,
          diagnoses: diagSnap.docs.map((d) => ({
            name: (d.data().name as string) ?? '',
            notes: (d.data().notes as string) ?? undefined,
          })),
          prescriptions: presSnap.docs.map((d) => ({
            name: (d.data().name as string) ?? '',
            morning: (d.data().morning as boolean) ?? false,
            afternoon: (d.data().afternoon as boolean) ?? false,
            evening: (d.data().evening as boolean) ?? false,
            night: (d.data().night as boolean) ?? false,
            days: (d.data().days as number) ?? 1,
            mealTiming: (d.data().mealTiming as 'before' | 'after' | undefined) ?? undefined,
          })),
          vaccines: vacSnap.docs.map((d) => ({
            name: (d.data().name as string) ?? '',
            batch: (d.data().batch as string) ?? undefined,
            nextDue: (d.data().nextDue as string) ?? undefined,
          })),
        })
        setLoading(false)
      })
      .catch((err) => {
        console.error('Summary page error:', err)
        setError('Failed to load summary. Please try again.')
        setLoading(false)
      })
  }, [visitId, clinicId, branchId])

  if (loading) return <LoadingState />
  if (error || !data) return <ErrorState message={error ?? 'Unknown error'} />

  const branding = data.clinic.branding ?? DEFAULTS
  const bg = branding.backgroundColor ?? DEFAULTS.backgroundColor
  const text = branding.textColor ?? DEFAULTS.textColor
  const primary = branding.primaryColor ?? DEFAULTS.primaryColor

  const doctorDisplayName =
    data.doctor?.name ?? data.visit.doctorName ?? '—'
  const doctorSpec = data.doctor?.specialization
  const visitDate = formatVisitDate(data.visit)

  const hasDiagnoses = data.diagnoses.length > 0
  const hasPrescriptions = data.prescriptions.length > 0
  const hasVaccines = data.vaccines.length > 0
  const hasNotes = !!data.visit.consultationNotes?.trim()

  const isBilled = data.visit.status === 'billed'
  const isFinished = isBilled || data.visit.status === 'completed'
  const services = data.visit.services ?? []
  const billAmount = data.visit.billAmount ?? 0
  const payments = data.visit.payments ?? []
  // Show the itemized bill for finished visits (completed OR billed) so customers
  // can review charges before paying. The "Paid via" block below stays gated on
  // payments.length, so an unpaid completed visit shows a "Payment pending" note.
  const hasBilling = isFinished && services.length > 0
  const paymentPending = isFinished && services.length > 0 && payments.length === 0

  // ── Inline styles (print-safe, no Tailwind tokens) ──────────────────────────

  const styles = {
    page: {
      minHeight: '100vh',
      background: bg,
      color: text,
      fontFamily: 'Quicksand, sans-serif',
      fontSize: '14px',
      lineHeight: '1.5',
    } as React.CSSProperties,

    container: {
      maxWidth: '720px',
      margin: '0 auto',
      padding: '32px 24px 48px',
    } as React.CSSProperties,

    // Header
    header: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '20px',
      paddingBottom: '20px',
      borderBottom: `2px solid ${primary}`,
      marginBottom: '24px',
    } as React.CSSProperties,

    logo: {
      width: '56px',
      height: '56px',
      objectFit: 'contain' as const,
      flexShrink: 0,
      borderRadius: '6px',
    } as React.CSSProperties,

    clinicName: {
      fontSize: '20px',
      fontWeight: 700,
      color: primary,
      margin: 0,
      lineHeight: 1.2,
    } as React.CSSProperties,

    clinicMeta: {
      fontSize: '12px',
      color: text,
      opacity: 0.65,
      margin: '4px 0 0',
    } as React.CSSProperties,

    // Section
    section: {
      marginBottom: '20px',
      paddingBottom: '20px',
      borderBottom: '1px solid #E8E4F0',
    } as React.CSSProperties,

    sectionTitle: {
      fontSize: '10px',
      fontWeight: 700,
      letterSpacing: '0.1em',
      textTransform: 'uppercase' as const,
      color: primary,
      marginBottom: '12px',
    } as React.CSSProperties,

    // Meta grid
    metaGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '8px 16px',
    } as React.CSSProperties,

    metaLabel: {
      fontSize: '10px',
      fontWeight: 600,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.07em',
      color: text,
      opacity: 0.5,
      marginBottom: '1px',
    } as React.CSSProperties,

    metaValue: {
      fontSize: '13px',
      fontWeight: 600,
      color: text,
    } as React.CSSProperties,

    // Diagnosis bullet
    diagItem: {
      display: 'flex',
      gap: '8px',
      marginBottom: '8px',
    } as React.CSSProperties,

    bullet: {
      color: primary,
      fontWeight: 700,
      flexShrink: 0,
      marginTop: '1px',
    } as React.CSSProperties,

    // Table
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
      fontSize: '12px',
    } as React.CSSProperties,

    th: {
      textAlign: 'left' as const,
      padding: '6px 10px',
      fontSize: '10px',
      fontWeight: 700,
      letterSpacing: '0.06em',
      textTransform: 'uppercase' as const,
      background: primary + '15',
      color: primary,
      borderBottom: `1px solid ${primary}30`,
    } as React.CSSProperties,

    thCenter: {
      textAlign: 'center' as const,
      padding: '6px 8px',
      fontSize: '10px',
      fontWeight: 700,
      letterSpacing: '0.06em',
      textTransform: 'uppercase' as const,
      background: primary + '15',
      color: primary,
      borderBottom: `1px solid ${primary}30`,
    } as React.CSSProperties,

    td: {
      padding: '8px 10px',
      borderBottom: '1px solid #F0EDF8',
      color: text,
      fontSize: '13px',
    } as React.CSSProperties,

    tdCenter: {
      padding: '8px 8px',
      borderBottom: '1px solid #F0EDF8',
      color: text,
      fontSize: '13px',
      textAlign: 'center' as const,
    } as React.CSSProperties,

    checkMark: {
      color: primary,
      fontWeight: 700,
    } as React.CSSProperties,

    // Notes
    notesBox: {
      background: primary + '08',
      border: `1px solid ${primary}25`,
      borderRadius: '6px',
      padding: '12px 14px',
      fontSize: '13px',
      color: text,
      whiteSpace: 'pre-wrap' as const,
      lineHeight: 1.6,
    } as React.CSSProperties,

    // Actions
    actions: {
      display: 'flex',
      gap: '12px',
      marginTop: '28px',
    } as React.CSSProperties,

    btnPrimary: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '10px 20px',
      background: primary,
      color: '#fff',
      border: 'none',
      borderRadius: '4px',
      fontSize: '13px',
      fontWeight: 700,
      cursor: 'pointer',
      fontFamily: 'Quicksand, sans-serif',
    } as React.CSSProperties,

    btnOutline: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '10px 20px',
      background: 'transparent',
      color: primary,
      border: `1.5px solid ${primary}`,
      borderRadius: '4px',
      fontSize: '13px',
      fontWeight: 700,
      cursor: 'pointer',
      fontFamily: 'Quicksand, sans-serif',
    } as React.CSSProperties,
  }

  return (
    <>
      {/* Print style — hides action buttons */}
      <style>{`@media print { .no-print { display: none !important; } }`}</style>

      <div
        style={{
          ...styles.page,
          '--clinic-primary': primary,
          '--clinic-accent': branding.accentColor ?? DEFAULTS.accentColor,
          '--clinic-bg': bg,
          '--clinic-text': text,
        } as React.CSSProperties}
      >
        <div style={styles.container}>

          {/* ── Header ──────────────────────────────────────────────────────── */}
          <div style={styles.header}>
            {data.clinic.logoUrl && (
              <img src={data.clinic.logoUrl} alt={data.clinic.name} style={styles.logo} />
            )}
            <div style={{ flex: 1 }}>
              <h1 style={styles.clinicName}>{data.clinic.name}</h1>
              {data.branch.name && (
                <p style={styles.clinicMeta}>
                  {data.branch.name}
                  {data.branch.address ? ` · ${data.branch.address}` : ''}
                </p>
              )}
              {data.branch.phone && (
                <p style={styles.clinicMeta}>{data.branch.phone}</p>
              )}
              {branding.tagline && (
                <p style={{ ...styles.clinicMeta, fontStyle: 'italic', opacity: 0.5, marginTop: '6px' }}>
                  {branding.tagline}
                </p>
              )}
            </div>
          </div>

          {/* ── Consultation Summary header ──────────────────────────────────── */}
          <div style={{ ...styles.section }}>
            <div style={styles.sectionTitle}>Consultation Summary</div>
            <div style={styles.metaGrid}>
              <div>
                <div style={styles.metaLabel}>Date</div>
                <div style={styles.metaValue}>{visitDate}</div>
              </div>
              <div>
                <div style={styles.metaLabel}>Token</div>
                <div style={{ ...styles.metaValue, color: primary }}>
                  {data.visit.tokenDisplay ?? '—'}
                </div>
              </div>
              <div>
                <div style={styles.metaLabel}>Doctor</div>
                <div style={styles.metaValue}>
                  {doctorDisplayName}
                  {doctorSpec ? <span style={{ fontWeight: 400, opacity: 0.65 }}> · {doctorSpec}</span> : null}
                </div>
              </div>
              <div>
                <div style={styles.metaLabel}>Pet Name</div>
                <div style={styles.metaValue}>
                  {data.visit.petName ?? '—'}
                  {(() => {
                    const species = data.pet?.speciesName
                      || (data.pet?.species ? ({ dog: 'Dog', cat: 'Cat', bird: 'Bird', rabbit: 'Rabbit', other: 'Other' }[data.pet.species] ?? data.pet.species) : null)
                      || data.visit.petSpecies
                    return species
                      ? <span style={{ fontWeight: 400, opacity: 0.65 }}> ({species})</span>
                      : null
                  })()}
                </div>
              </div>
              <div>
                <div style={styles.metaLabel}>Owner</div>
                <div style={styles.metaValue}>{data.visit.ownerName ?? '—'}</div>
              </div>
              <div>
                <div style={styles.metaLabel}>Phone</div>
                <div style={styles.metaValue}>{data.visit.ownerPhone ?? '—'}</div>
              </div>
              {data.pet?.breed && (
                <div>
                  <div style={styles.metaLabel}>Pet Breed</div>
                  <div style={styles.metaValue}>{data.pet.breed}</div>
                </div>
              )}
              {getAgeFromDob(data.pet?.dateOfBirth) && (
                <div>
                  <div style={styles.metaLabel}>Pet Age</div>
                  <div style={styles.metaValue}>{getAgeFromDob(data.pet?.dateOfBirth)}</div>
                </div>
              )}
              {typeof data.visit.petWeightKg === 'number' && (
                <div>
                  <div style={styles.metaLabel}>Weight</div>
                  <div style={styles.metaValue}>{data.visit.petWeightKg} kg</div>
                </div>
              )}
              {data.pet?.color && (
                <div>
                  <div style={styles.metaLabel}>Pet Color / Marking</div>
                  <div style={styles.metaValue}>{data.pet.color}</div>
                </div>
              )}
            </div>
          </div>

          {/* ── Diagnosis ───────────────────────────────────────────────────── */}
          {hasDiagnoses && (
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Diagnosis</div>
              {data.diagnoses.map((d, i) => (
                <div key={i} style={styles.diagItem}>
                  <span style={styles.bullet}>•</span>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '13px' }}>{d.name}</span>
                    {d.notes && (
                      <span style={{ fontSize: '12px', opacity: 0.65 }}> — {d.notes}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Prescriptions ───────────────────────────────────────────────── */}
          {hasPrescriptions && (
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Prescriptions</div>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Medicine</th>
                    <th style={styles.thCenter}>M</th>
                    <th style={styles.thCenter}>A</th>
                    <th style={styles.thCenter}>E</th>
                    <th style={styles.thCenter}>N</th>
                    <th style={styles.thCenter}>Days</th>
                  </tr>
                </thead>
                <tbody>
                  {data.prescriptions.map((p, i) => (
                    <tr key={i}>
                      <td style={styles.td}>
                        {p.name}
                        {p.mealTiming && (
                          <span style={{ display: 'block', fontSize: '11px', opacity: 0.6, marginTop: '2px' }}>
                            {p.mealTiming === 'before' ? 'Before food' : 'After food'}
                          </span>
                        )}
                      </td>
                      <td style={styles.tdCenter}>
                        {p.morning ? <span style={styles.checkMark}>✓</span> : null}
                      </td>
                      <td style={styles.tdCenter}>
                        {p.afternoon ? <span style={styles.checkMark}>✓</span> : null}
                      </td>
                      <td style={styles.tdCenter}>
                        {p.evening ? <span style={styles.checkMark}>✓</span> : null}
                      </td>
                      <td style={styles.tdCenter}>
                        {p.night ? <span style={styles.checkMark}>✓</span> : null}
                      </td>
                      <td style={styles.tdCenter}>{p.days}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ fontSize: '10px', opacity: 0.5, marginTop: '6px' }}>
                M = Morning · A = Afternoon · E = Evening · N = Night
              </p>
            </div>
          )}

          {/* ── Vaccines ────────────────────────────────────────────────────── */}
          {hasVaccines && (
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Vaccines</div>
              {data.vaccines.map((v, i) => (
                <div key={i} style={{ ...styles.diagItem, alignItems: 'flex-start' }}>
                  <span style={styles.bullet}>•</span>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '13px' }}>{v.name}</span>
                    {v.batch && (
                      <span style={{ fontSize: '12px', opacity: 0.65 }}> — Batch: {v.batch}</span>
                    )}
                    {v.nextDue && (
                      <span style={{ fontSize: '12px', opacity: 0.65 }}> — Next due: {v.nextDue}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Consultation Notes ───────────────────────────────────────────── */}
          {hasNotes && (
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Consultation Notes</div>
              <div style={styles.notesBox}>{data.visit.consultationNotes}</div>
            </div>
          )}

          {/* ── Services & Payment ──────────────────────────────────────────── */}
          {hasBilling && (
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Services &amp; Payment</div>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Service</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((s, i) => (
                    <tr key={s.serviceId ?? i}>
                      <td style={styles.td}>{s.name}</td>
                      <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600 }}>
                        {formatInr((s.quantity ?? 1) * s.price)}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td
                      style={{
                        ...styles.td,
                        background: primary + '12',
                        fontWeight: 700,
                        fontSize: '13px',
                        color: primary,
                        borderTop: `1px solid ${primary}30`,
                        borderBottom: 'none',
                      }}
                    >
                      Total
                    </td>
                    <td
                      style={{
                        ...styles.td,
                        background: primary + '12',
                        fontWeight: 700,
                        fontSize: '15px',
                        color: primary,
                        textAlign: 'right',
                        borderTop: `1px solid ${primary}30`,
                        borderBottom: 'none',
                      }}
                    >
                      {formatInr(billAmount)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Payment method(s) */}
              {payments.length > 0 && (
                <div
                  style={{
                    marginTop: '12px',
                    padding: '10px 14px',
                    background: primary + '08',
                    border: `1px solid ${primary}25`,
                    borderRadius: '6px',
                    display: 'flex',
                    flexDirection: 'column' as const,
                    gap: '6px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase' as const,
                      color: primary,
                      marginBottom: '2px',
                    }}
                  >
                    Paid via
                  </div>
                  {payments.map((p, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: text,
                      }}
                    >
                      <span>{PAYMENT_LABELS[p.method] ?? p.method}</span>
                      <span>{formatInr(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Unpaid finished visit — show pending note instead of a payment block.
                  Tone derived from `text` so it stays legible on any branded background. */}
              {paymentPending && (
                <div
                  style={{
                    marginTop: '12px',
                    padding: '10px 14px',
                    background: text + '0D',
                    border: `1px solid ${text}26`,
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: text,
                    opacity: 0.85,
                  }}
                >
                  Payment pending — please settle at the clinic.
                </div>
              )}
            </div>
          )}

          {/* ── Actions (hidden on print) ────────────────────────────────────── */}
          <div style={styles.actions} className="no-print">
            {/* Download PDF: uses window.print() — browser save-as-PDF works for clean output */}
            <button
              type="button"
              style={styles.btnPrimary}
              onClick={() => window.print()}
            >
              ↓ Download PDF
            </button>
            <button
              type="button"
              style={styles.btnOutline}
              onClick={() => window.print()}
            >
              ⎙ Print
            </button>
          </div>

          {/* ── Footer ──────────────────────────────────────────────────────── */}
          <p style={{ fontSize: '11px', opacity: 0.35, marginTop: '32px', textAlign: 'center' }}>
            Powered by Shomer · shomer.app
          </p>
        </div>
      </div>
    </>
  )
}
