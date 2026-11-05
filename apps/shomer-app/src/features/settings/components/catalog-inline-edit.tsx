import { useState } from 'react'
import { Pencil } from 'lucide-react'

const fieldClass =
  'min-w-0 rounded-[4px] border border-border-base bg-white px-3 py-[7px] text-[13px] text-foreground placeholder:text-muted/60 focus:border-primary focus:outline-none transition-colors'

export function CatalogEditButton({ name, onClick }: { name: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Edit ${name}`}
      className="flex items-center gap-1.5 rounded-[3px] px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10 transition-colors"
    >
      <Pencil size={11} /> Edit
    </button>
  )
}

export function CatalogEditForm({
  initialName,
  initialPrice,
  saving,
  error,
  onCancel,
  onSave,
}: {
  initialName: string
  /** Set when this catalog row has a price. Omit it for diagnoses and medicines. */
  initialPrice?: number
  saving: boolean
  error: string | null
  onCancel: () => void
  onSave: (name: string, price?: number) => void
}) {
  const priced = initialPrice !== undefined
  const [name, setName] = useState(initialName)
  const [price, setPrice] = useState(initialPrice === undefined ? '' : String(initialPrice))

  const parsed = Number(price)
  const priceOk = !priced || (price.trim() !== '' && Number.isFinite(parsed) && parsed >= 0)
  const nextPrice = priced ? Math.round(parsed) : undefined
  const changed =
    name.trim() !== initialName.trim() || (priced && nextPrice !== initialPrice)
  const canSave = name.trim().length > 0 && priceOk && changed && !saving

  return (
    <div className="flex flex-1 flex-col gap-1.5 min-w-0">
      <div className="flex items-center gap-2 min-w-0">
        <input
          type="text"
          aria-label="Name"
          value={name}
          disabled={saving}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && canSave) onSave(name.trim(), nextPrice)
            if (e.key === 'Escape') onCancel()
          }}
          className={`${fieldClass} flex-1`}
        />
        {priced && (
          <div className="relative flex-shrink-0">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[13px] text-muted">₹</span>
            <input
              type="number"
              min={0}
              aria-label="Price"
              value={price}
              disabled={saving}
              onChange={(e) => setPrice(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canSave) onSave(name.trim(), nextPrice)
                if (e.key === 'Escape') onCancel()
              }}
              className={`${fieldClass} w-24 pl-6 pr-2`}
            />
          </div>
        )}
        <button
          type="button"
          disabled={!canSave}
          onClick={() => onSave(name.trim(), nextPrice)}
          className="rounded-[3px] border border-primary px-2.5 py-1 text-[11px] font-semibold text-primary hover:opacity-85 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onCancel}
          className="rounded-[3px] px-2.5 py-1 text-[11px] font-semibold text-muted hover:bg-surface-2 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-[11px] text-danger">{error}</p>}
    </div>
  )
}
