import { formatInr } from '../../../lib/utils'
import { type VisitDiscount } from './discount'

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  upi: 'UPI',
}

export interface BillServiceLine {
  name: string
  price: number
  quantity?: number
}

/** What Check-out sends to the thermal slip. Amounts are rupees. */
export interface CheckoutBill {
  clinicName: string
  branchName: string
  branchAddress: string
  /** Visit day, `YYYY-MM-DD`. */
  date: string
  token: string
  petName: string
  ownerName: string
  doctorName: string
  services: BillServiceLine[]
  discount: VisitDiscount | null
  payments: { method: string; amount: number }[]
  total: number
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function formatBillDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return iso
  const month = MONTHS[Number(match[2]) - 1]
  if (!month) return iso
  return `${match[3]} ${month} ${match[1]}`
}

function row(left: string, right: string, extraClass = ''): string {
  return `<div class="row ${extraClass}"><span>${esc(left)}</span><span class="amt">${esc(right)}</span></div>`
}

/**
 * The RP-3220 head prints 72 mm of an 80 mm roll. Chrome drops `72mm auto`,
 * so the slip ships with a tall fallback page and print replaces the height
 * once the bill has been measured.
 */
const BILL_PAGE_WIDTH_MM = 72
const BILL_PAGE_FALLBACK_HEIGHT_MM = 200

/** CSS pixels are 96 per inch. Round up so the last line stays on the page. */
export function billPageHeightMm(heightPx: number): number {
  if (!Number.isFinite(heightPx) || heightPx <= 0) return 0
  return Math.ceil((heightPx * 25.4) / 96)
}

/** Swap the fallback page height for the measured bill height. */
export function withBillPageHeight(html: string, heightMm: number): string {
  const height = Number.isFinite(heightMm) && heightMm > 0
    ? Math.ceil(heightMm)
    : BILL_PAGE_FALLBACK_HEIGHT_MM
  return html.replace(
    /size:\s*72mm\s+[\d.]+mm;/,
    `size: ${BILL_PAGE_WIDTH_MM}mm ${height}mm;`,
  )
}

/**
 * Receipt HTML for the 72 mm print head. Black type only, at that width, so
 * the browser does not scale a wide page down onto the roll.
 */
export function renderCheckoutBill(bill: CheckoutBill): string {
  const clinic = bill.clinicName.trim() || 'Clinic'
  const lines: string[] = []

  lines.push(`<h1>${esc(clinic.toUpperCase())}</h1>`)
  if (bill.branchName.trim()) lines.push(`<p class="branch">${esc(bill.branchName.trim())}</p>`)
  if (bill.branchAddress.trim()) lines.push(`<p class="address">${esc(bill.branchAddress.trim())}</p>`)
  lines.push('<div class="rule double"></div>')
  lines.push('<p class="title">BILL</p>')
  lines.push(row(formatBillDate(bill.date), bill.token, 'strong'))
  lines.push(row('Pet name', bill.petName))
  lines.push(row('Parent', bill.ownerName))
  lines.push(row('Doctor', bill.doctorName))
  lines.push('<div class="rule"></div>')
  lines.push(row('Service', 'Amount', 'head'))

  let subtotal = 0
  for (const service of bill.services) {
    const quantity = service.quantity ?? 1
    const amount = quantity * service.price
    subtotal += amount
    lines.push('<div class="rule thin"></div>')
    lines.push(row(service.name, formatInr(amount)))
    if (quantity > 1) {
      lines.push(`<p class="qty">${esc(`${quantity} × ${formatInr(service.price)}`)}</p>`)
    }
  }

  lines.push('<div class="rule"></div>')
  if (bill.discount && bill.discount.amount > 0) {
    const label = bill.discount.kind === 'percent' ? `Discount ${bill.discount.value}%` : 'Discount'
    lines.push(row('Subtotal', formatInr(subtotal)))
    lines.push(row(label, formatInr(bill.discount.amount)))
    lines.push('<div class="rule double"></div>')
  }
  lines.push(row('TOTAL', formatInr(bill.total), 'total'))
  lines.push('<div class="rule double"></div>')

  const paid = bill.payments.reduce((sum, payment) => sum + payment.amount, 0)
  const due = bill.total - paid
  if (paid > 0) {
    for (const payment of bill.payments) {
      const label = PAYMENT_LABELS[payment.method] ?? payment.method
      lines.push(row(label, formatInr(payment.amount)))
    }
  }
  if (due > 0) {
    lines.push(row('To pay', formatInr(due), 'strong'))
  } else {
    lines.push('<p class="center">Paid in full</p>')
  }

  lines.push('<div class="rule"></div>')
  lines.push('<p class="center thanks">Thank you</p>')
  lines.push('<p class="keep">Please keep this bill</p>')
  lines.push(`<p class="brand">Shomer × ${esc(clinic)}</p>`)

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Bill ${esc(bill.token)}</title>
<style>
  @page { size: ${BILL_PAGE_WIDTH_MM}mm ${BILL_PAGE_FALLBACK_HEIGHT_MM}mm; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #000; }
  body {
    width: ${BILL_PAGE_WIDTH_MM}mm;
    padding: 5mm 2mm 7mm;
    font-family: "Segoe UI", "Nirmala UI", "Helvetica Neue", Arial, sans-serif;
    font-size: 12px;
    line-height: 1.35;
    color: #000;
    -webkit-font-smoothing: none;
  }
  h1 { margin: 0; text-align: center; font-size: 16px; font-weight: 800; line-height: 1.2; overflow-wrap: anywhere; }
  .branch { margin: 2px 0 0; text-align: center; font-size: 12px; font-weight: 700; overflow-wrap: anywhere; }
  .address { margin: 2px 0 0; text-align: center; font-size: 11px; font-weight: 500; overflow-wrap: anywhere; }
  .title { margin: 8px 0 6px; text-align: center; font-size: 14px; font-weight: 800; letter-spacing: 0.12em; }
  .rule { border-top: 1.5px solid #000; margin: 7px 0; height: 0; }
  .rule.thin { border-top-width: 0; margin: 3px 0; }
  .rule.double { border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; height: 5px; }
  .row { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; margin: 2px 0; }
  .row span:first-child { min-width: 0; overflow-wrap: anywhere; }
  .amt { font-weight: 700; text-align: right; white-space: nowrap; }
  .strong span, .head span { font-weight: 700; }
  .total span { font-size: 16px; font-weight: 800; }
  .qty { margin: 0 0 2px; padding-left: 8px; font-size: 11px; font-weight: 500; }
  .center { margin: 4px 0 0; text-align: center; font-weight: 700; }
  .thanks { margin-top: 2px; }
  .keep { margin: 1px 0 0; text-align: center; font-size: 11px; font-weight: 500; }
  .brand { margin: 8px 0 0; text-align: center; font-size: 10px; font-weight: 500; }
</style>
</head>
<body>
${lines.join('\n')}
</body>
</html>`
}

/** Open the slip in a hidden frame and use the browser print dialog. */
export function printCheckoutBill(bill: CheckoutBill): boolean {
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  // 72 mm wide so lines wrap as they will on the head. A 1 px frame keeps
  // body.offsetHeight equal to the slip, and left of the screen hides it.
  frame.style.cssText = 'position:fixed;left:-80mm;top:0;width:72mm;height:1px;border:0'
  document.body.appendChild(frame)
  const doc = frame.contentDocument
  const win = frame.contentWindow
  if (!doc || !win) {
    frame.remove()
    return false
  }
  doc.open()
  doc.write(renderCheckoutBill(bill))
  doc.close()
  const remove = () => frame.remove()
  win.addEventListener('afterprint', remove)
  window.setTimeout(() => {
    const heightPx = doc.body?.offsetHeight ?? 0
    const heightMm = billPageHeightMm(heightPx)
    if (heightMm) {
      doc.open()
      doc.write(withBillPageHeight(renderCheckoutBill(bill), heightMm))
      doc.close()
    }
    win.focus()
    win.print()
  }, 150)
  window.setTimeout(remove, 60_000)
  return true
}
