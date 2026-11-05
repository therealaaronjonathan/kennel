import { describe, expect, test } from 'bun:test'
import { planMethodReclass, type LedgerSlice } from './payment-ledger-reclass'

function row(id: string, date: string, method: LedgerSlice['method'], amount: number): LedgerSlice {
  return { id, date, method, amount }
}

describe('planMethodReclass', () => {
  test('a same-day method change keeps the amount and the date', () => {
    const plan = planMethodReclass(
      [row('old', '2026-11-05', 'upi', 1300)],
      [{ method: 'card', amount: 1300 }],
    )
    expect(plan).toEqual({
      ok: true,
      changed: true,
      deleteIds: ['old'],
      rows: [{ date: '2026-11-05', method: 'card', amount: 1300 }],
    })
  })

  test('an unchanged split does not rewrite the ledger', () => {
    const plan = planMethodReclass(
      [row('a', '2026-11-05', 'cash', 400), row('b', '2026-11-05', 'upi', 600)],
      [
        { method: 'cash', amount: 400 },
        { method: 'upi', amount: 600 },
      ],
    )
    expect(plan).toEqual({ ok: true, changed: false })
  })

  test('one day can split into two methods', () => {
    const plan = planMethodReclass(
      [row('a', '2026-11-05', 'cash', 1000)],
      [
        { method: 'cash', amount: 400 },
        { method: 'upi', amount: 600 },
      ],
    )
    expect(plan.ok && plan.changed && plan.rows).toEqual([
      { date: '2026-11-05', method: 'cash', amount: 400 },
      { date: '2026-11-05', method: 'upi', amount: 600 },
    ])
  })

  test('money collected on two days stays on those days', () => {
    const plan = planMethodReclass(
      [row('d1', '2026-11-01', 'cash', 200), row('d2', '2026-11-03', 'upi', 300)],
      [{ method: 'card', amount: 500 }],
    )
    expect(plan.ok && plan.changed && plan.rows).toEqual([
      { date: '2026-11-01', method: 'card', amount: 200 },
      { date: '2026-11-03', method: 'card', amount: 300 },
    ])
  })

  test('a later negative day keeps its date and the method totals', () => {
    const plan = planMethodReclass(
      [row('d1', '2026-11-01', 'cash', 500), row('d2', '2026-11-03', 'cash', -100)],
      [{ method: 'card', amount: 400 }],
    )
    expect(plan.ok && plan.changed && plan.rows).toEqual([
      { date: '2026-11-03', method: 'card', amount: -100 },
      { date: '2026-11-01', method: 'card', amount: 500 },
    ])
  })

  test('a total that does not match is left alone', () => {
    const plan = planMethodReclass(
      [row('a', '2026-11-05', 'upi', 100)],
      [{ method: 'card', amount: 200 }],
    )
    expect(plan).toEqual({ ok: false, reason: 'sum-mismatch' })
  })
})
