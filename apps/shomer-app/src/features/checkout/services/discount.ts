export type DiscountKind = 'amount' | 'percent'

/** Stored on the visit. `amount` is the rupees taken off the service total. */
export interface VisitDiscount {
  kind: DiscountKind
  value: number
  amount: number
}

export interface DiscountApprover {
  id: string
  name: string
  role: 'doctor' | 'receptionist'
}

export function serviceSubtotal(services: { price: number; quantity?: number }[]): number {
  return services.reduce((sum, s) => sum + (s.quantity ?? 1) * s.price, 0)
}

export function amountDue(subtotal: number, discount: VisitDiscount | null | undefined): number {
  if (!discount) return subtotal
  return Math.max(0, subtotal - discount.amount)
}

export function parseVisitDiscount(raw: unknown): VisitDiscount | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const d = raw as Record<string, unknown>
  const kind = d.kind === 'percent' || d.kind === 'amount' ? d.kind : null
  if (!kind) return undefined
  const value = typeof d.value === 'number' ? d.value : Number.NaN
  const amount = typeof d.amount === 'number' ? d.amount : Number.NaN
  if (!Number.isFinite(value) || !Number.isFinite(amount) || amount <= 0) return undefined
  return { kind, value, amount }
}

export type DiscountQuote =
  | { ok: true; discount: VisitDiscount | null }
  | { ok: false; error: string }

/**
 * Turn the desk's entry into a discount.
 * An empty value clears the discount. The approver is checked separately.
 */
export function quoteDiscount(input: {
  subtotal: number
  kind: DiscountKind
  rawValue: string
  alreadyPaid: number
}): DiscountQuote {
  const trimmed = input.rawValue.trim()
  if (trimmed === '' || Number(trimmed) === 0) {
    return { ok: true, discount: null }
  }
  if (input.subtotal <= 0) {
    return { ok: false, error: 'Add a service before applying a discount.' }
  }
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n <= 0) {
    return { ok: false, error: 'Enter a discount.' }
  }
  if (input.kind === 'percent') {
    if (!Number.isInteger(n) || n < 1 || n > 100) {
      return { ok: false, error: 'Enter a whole percent from 1 to 100.' }
    }
  } else if (!Number.isInteger(n) || n < 1) {
    return { ok: false, error: 'Enter the discount in whole rupees.' }
  }

  const amount = input.kind === 'percent' ? Math.round((input.subtotal * n) / 100) : n
  if (amount <= 0) {
    return { ok: false, error: 'That percent rounds to ₹0. Enter a larger percent.' }
  }
  if (amount > input.subtotal) {
    return { ok: false, error: 'Discount is more than the service total.' }
  }
  const due = input.subtotal - amount
  if (due < input.alreadyPaid) {
    return { ok: false, error: 'Discount is larger than the amount still unpaid.' }
  }
  return { ok: true, discount: { kind: input.kind, value: n, amount } }
}

export function withApprover(quote: DiscountQuote, approver: DiscountApprover | null): DiscountQuote {
  if (!quote.ok) return quote
  if (quote.discount && !approver) {
    return { ok: false, error: 'Choose who approved this discount.' }
  }
  return quote
}

export function sameDiscount(
  a: VisitDiscount | null | undefined,
  b: VisitDiscount | null | undefined,
): boolean {
  if (!a && !b) return true
  if (!a || !b) return false
  return a.kind === b.kind && a.value === b.value && a.amount === b.amount
}

function rupees(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`
}

/** Pet-parent and staff bill row. Percent shows both the percent and the rupees. */
export function discountLine(d: VisitDiscount): string {
  if (d.kind === 'percent') return `Discount ${d.value}% (${rupees(d.amount)})`
  return `Discount ${rupees(d.amount)}`
}
