import { describe, expect, test } from 'bun:test'
import { billPageHeightMm, renderCheckoutBill, withBillPageHeight } from './checkout-bill-print'

const base = {
  clinicName: 'My Clinic',
  branchName: 'ECR Branch',
  branchAddress: '4th main-road, Gandhi Nagar, Adyar, Chennai-600020',
  date: '2026-11-05',
  token: 'MAR-0002',
  petName: 'Sasha',
  ownerName: 'Aaron',
  doctorName: 'Dr. Rajesh Kumar',
  services: [
    { name: 'VAC ARV', price: 400, quantity: 2 },
    { name: 'DR PROFF FEE', price: 600, quantity: 1 },
  ],
  discount: { kind: 'amount' as const, value: 100, amount: 100 },
  payments: [{ method: 'card' as const, amount: 1300 }],
  total: 1300,
}

describe('renderCheckoutBill', () => {
  test('uses pet name, parent, and a quiet Shomer line', () => {
    const html = renderCheckoutBill(base)
    expect(html).toContain('Pet name')
    expect(html).toContain('Parent')
    expect(html).not.toContain('>Owner<')
    expect(html).not.toContain('>Pet<')
    expect(html).toContain('Shomer × My Clinic')
    expect(html).toContain('Sasha')
    expect(html).toContain('₹800')
    expect(html).toContain('2 × ₹400')
    expect(html).toContain('₹1,300')
    expect(html).toContain('Paid in full')
    expect(html).toContain('size: 72mm 200mm')
    expect(html).toContain('width: 72mm')
    expect(html).not.toContain('80mm')
  })

  test('measures the page in millimetres and keeps the width at 72', () => {
    expect(billPageHeightMm(96)).toBe(26)
    expect(billPageHeightMm(0)).toBe(0)
    const sized = withBillPageHeight(renderCheckoutBill(base), 118.2)
    expect(sized).toContain('size: 72mm 119mm')
    expect(sized).not.toContain('200mm')
  })

  test('shows to pay when nothing has been collected', () => {
    const html = renderCheckoutBill({ ...base, payments: [], total: 1300 })
    expect(html).toContain('To pay')
    expect(html).toContain('₹1,300')
    expect(html).not.toContain('Paid in full')
  })

  test('a partial payment leaves the remainder to pay', () => {
    const html = renderCheckoutBill({
      ...base,
      discount: null,
      payments: [{ method: 'upi', amount: 1000 }],
      total: 8000,
      services: [
        { name: 'ONLINE CONSULTATION', price: 500, quantity: 1 },
        { name: 'DR JP SURGERY FEE', price: 7500, quantity: 1 },
      ],
    })
    expect(html).toContain('UPI')
    expect(html).toContain('₹1,000')
    expect(html).toContain('To pay')
    expect(html).toContain('₹7,000')
    expect(html).not.toContain('Paid in full')
  })

  test('escapes clinic text', () => {
    const html = renderCheckoutBill({ ...base, clinicName: 'A & B <Clinic>' })
    expect(html).toContain('A &amp; B &lt;Clinic&gt;')
    expect(html).toContain('Shomer × A &amp; B &lt;Clinic&gt;')
  })
})
