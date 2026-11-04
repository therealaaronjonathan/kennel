import { describe, expect, test } from 'bun:test'
import {
  amountDue,
  parseVisitDiscount,
  quoteDiscount,
  serviceSubtotal,
  withApprover,
} from './discount'

const approver = { id: 'd1', name: 'Dr. Rao', role: 'doctor' as const }

describe('quoteDiscount', () => {
  test('10% of 333 rounds to 33 and the amount due is 300', () => {
    const quote = quoteDiscount({ subtotal: 333, kind: 'percent', rawValue: '10', alreadyPaid: 0 })
    expect(quote.ok).toBe(true)
    if (!quote.ok) return
    expect(quote.discount).toEqual({ kind: 'percent', value: 10, amount: 33 })
    expect(amountDue(333, quote.discount)).toBe(300)
  })

  test('a rupee discount is taken off the service total', () => {
    const quote = quoteDiscount({ subtotal: 800, kind: 'amount', rawValue: '200', alreadyPaid: 0 })
    expect(quote.ok).toBe(true)
    if (!quote.ok) return
    expect(amountDue(800, quote.discount)).toBe(600)
  })

  test('an empty value clears the discount', () => {
    const quote = quoteDiscount({ subtotal: 800, kind: 'amount', rawValue: '', alreadyPaid: 0 })
    expect(quote).toEqual({ ok: true, discount: null })
  })

  test('refuses a discount larger than what is still unpaid', () => {
    const quote = quoteDiscount({ subtotal: 500, kind: 'amount', rawValue: '400', alreadyPaid: 200 })
    expect(quote.ok).toBe(false)
  })

  test('a saved discount needs an approver', () => {
    const quote = quoteDiscount({ subtotal: 500, kind: 'amount', rawValue: '50', alreadyPaid: 0 })
    expect(withApprover(quote, null).ok).toBe(false)
    expect(withApprover(quote, approver).ok).toBe(true)
  })

  test('service total counts quantity', () => {
    expect(serviceSubtotal([{ price: 100, quantity: 2 }, { price: 50 }])).toBe(250)
  })

  test('ignores a missing discount on older visits', () => {
    expect(parseVisitDiscount(undefined)).toBeUndefined()
    expect(parseVisitDiscount({ kind: 'amount', value: 20, amount: 20 })?.amount).toBe(20)
  })
})
