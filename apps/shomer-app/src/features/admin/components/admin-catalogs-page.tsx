import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Plus, Trash2, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MEDICINE_TYPES, type MedicineType } from '@/features/settings/services/clinic-lists-service'

type CatalogTab = 'diagnoses' | 'medicines' | 'services' | 'grooming'

interface CatalogItem {
  id: string
  name: string
  isActive: boolean
  price?: number
  type?: MedicineType
}

const labelClass = 'text-[10px] font-semibold uppercase tracking-[0.08em] text-muted'
const inputClass =
  'flex-1 rounded-[4px] border border-border-base bg-white px-3 py-[9px] text-[13px] text-foreground placeholder:text-muted/60 focus:border-primary focus:outline-none transition-colors'

// ── Catalog paths ──────────────────────────────────────────────────────────────

function collectionPath(clinicId: string, tab: CatalogTab): string {
  switch (tab) {
    case 'diagnoses': return `clinics/${clinicId}/diagnosisCatalog`
    case 'medicines': return `clinics/${clinicId}/medicinesCatalog`
    case 'services': return `clinics/${clinicId}/services`
    case 'grooming': return `clinics/${clinicId}/groomingServices`
  }
}

function hasPrice(tab: CatalogTab): boolean {
  return tab === 'services' || tab === 'grooming'
}

// ── Catalog tab content ────────────────────────────────────────────────────────

function CatalogTabContent({ clinicId, tab }: { clinicId: string; tab: CatalogTab }) {
  const [items, setItems] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [adding, setAdding] = useState(false)
  const [filter, setFilter] = useState('')

  const withPrice = hasPrice(tab)
  const isMedicine = tab === 'medicines'
  const [medType, setMedType] = useState<MedicineType>('tablet')
  const path = collectionPath(clinicId, tab)

  async function loadItems() {
    setLoading(true)
    try {
      const snap = await getDocs(collection(db, path))
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CatalogItem)))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadItems()
  }, [clinicId, tab])

  async function handleAdd() {
    const trimmedName = name.trim()
    if (!trimmedName) return
    if (withPrice) {
      const parsedPrice = parseFloat(price)
      if (isNaN(parsedPrice) || parsedPrice < 0) return
    }
    setAdding(true)
    try {
      const data: Record<string, unknown> = {
        name: trimmedName,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
      if (withPrice) data.price = parseFloat(price)
      if (isMedicine) data.type = medType
      await addDoc(collection(db, path), data)
      setName('')
      setPrice('')
      setMedType('tablet')
      await loadItems()
    } finally {
      setAdding(false)
    }
  }

  async function toggleActive(item: CatalogItem) {
    await updateDoc(doc(db, path, item.id), {
      isActive: !item.isActive,
      updatedAt: serverTimestamp(),
    })
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, isActive: !i.isActive } : i)),
    )
  }

  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(filter.toLowerCase()),
  )

  const canAdd = withPrice
    ? name.trim() && price && !isNaN(parseFloat(price)) && parseFloat(price) >= 0
    : name.trim()

  return (
    <div className="space-y-4">
      {/* Add row */}
      <div className="space-y-1.5">
        <p className={labelClass}>Add Item</p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={
              tab === 'diagnoses' ? 'e.g. Skin Allergy, Parvovirus…' :
              tab === 'medicines' ? 'e.g. Amoxicillin 250mg…' :
              tab === 'services' ? 'Service name…' :
              'Grooming service name…'
            }
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => !withPrice && e.key === 'Enter' && handleAdd()}
            className={inputClass}
          />
          {withPrice && (
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
          )}
          <button
            type="button"
            disabled={!canAdd || adding}
            onClick={handleAdd}
            className="flex items-center gap-1.5 rounded-[4px] bg-primary px-3 py-[9px] text-[13px] font-semibold text-white hover:opacity-85 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={14} />
            Add
          </button>
        </div>
        {isMedicine && (
          // Type — drives the quantity control the doctor sees when prescribing.
          <div className="flex gap-1.5 pt-1">
            {MEDICINE_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setMedType(t.value)}
                className={cn(
                  'flex-1 rounded-[4px] border px-3 py-1.5 text-[12px] font-semibold transition-colors',
                  medType === t.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border-base text-muted hover:text-foreground',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filter */}
      {items.length > 6 && (
        <input
          type="text"
          placeholder="Filter list…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full rounded-[4px] border border-border-base bg-white px-3 py-[9px] text-[13px] text-foreground placeholder:text-muted/60 focus:border-primary focus:outline-none transition-colors"
        />
      )}

      {/* List */}
      {loading ? (
        <p className="text-[12px] text-muted">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-[12px] text-muted">No items yet.</p>
      ) : (
        <div className="rounded-[4px] border border-border-base overflow-hidden divide-y divide-border-base">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={cn(
                'flex items-center justify-between px-4 py-3 bg-surface transition-colors',
                !item.isActive && 'opacity-40',
              )}
            >
              <div className="flex items-center gap-4">
                <span
                  className={cn(
                    'text-[13px] text-foreground',
                    !item.isActive && 'line-through text-muted',
                  )}
                >
                  {item.name}
                </span>
                {isMedicine && (
                  <span className="rounded-[3px] bg-surface-2 border border-border-base px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-muted">
                    {item.type ?? 'tablet'}
                  </span>
                )}
                {withPrice && item.price !== undefined && (
                  <span className="text-[12px] font-semibold text-muted">
                    ₹{item.price.toLocaleString('en-IN')}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => toggleActive(item)}
                className={cn(
                  'flex items-center gap-1.5 rounded-[3px] px-2.5 py-1 text-[11px] font-semibold transition-colors',
                  item.isActive
                    ? 'text-danger hover:bg-danger/10'
                    : 'text-success hover:bg-success/10',
                )}
              >
                {item.isActive ? (
                  <><Trash2 size={11} /> Remove</>
                ) : (
                  <><RotateCcw size={11} /> Restore</>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export function AdminCatalogsPage() {
  const { id: clinicId } = useParams<{ id: string }>()
  const [activeTab, setActiveTab] = useState<CatalogTab>('diagnoses')

  if (!clinicId) {
    return (
      <div className="flex items-center justify-center flex-1 h-full">
        <p className="text-[13px] text-danger">No clinic selected.</p>
      </div>
    )
  }

  const tabs: { key: CatalogTab; label: string }[] = [
    { key: 'diagnoses', label: 'Diagnoses' },
    { key: 'medicines', label: 'Medicines' },
    { key: 'services', label: 'Services' },
    { key: 'grooming', label: 'Grooming' },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="h-[52px] border-b border-border-base bg-surface flex items-center px-6 flex-shrink-0">
        <h1 className="font-display text-[18px] font-bold text-foreground leading-none">
          Catalogs
        </h1>
      </header>

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
          <CatalogTabContent key={activeTab} clinicId={clinicId} tab={activeTab} />
        </div>
      </div>
    </div>
  )
}
