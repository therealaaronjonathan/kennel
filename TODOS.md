# TODOS

Deferred work, with enough context to pick up cold.

## Consolidate the two visit detail panels (DRY)

**Problem:** There are two near-duplicate detail-panel components showing the same
visit info:
- `features/dashboard/components/visit-detail-panel.tsx` (`VisitDetailPanel`) — used by
  the reception Queue, Home dashboard, and History.
- `features/checkout/components/checkout-page.tsx` (`CheckoutPanel`, local) — used only by
  Checkout, backed by `useCheckoutDetail`.

They have diverged. Name editing (`edit-names.ts` + `EditNameDialog`) and the owner-phone
display had to be wired into **each panel separately** (v1.1.21 work). Any future
field/feature added to one will silently skip the other.

**Fix:** Collapse to one shared panel with a billing-actions slot. `VisitDetailPanel`
already covers Owner → Pet → Visit → Clinical → Services + name edit + phone; `CheckoutPanel`
adds the transactional actions — **Mark Billed**, split/partial payment, **Pin to billing
defaults**, and inline services editing. Approach: lift those into a `<BillingActions>`
(or render-prop/children slot) that Checkout passes in, so all four surfaces render one
component.

**Risk:** Med — must port and re-test the billing flow (`recordPayments`, `PaymentMethodDialog`,
`SplitPaymentDialog`, `billingDefaults`). Worth a `/plan-eng-review` before starting.

Logged by `/plan-ceo-review` on 2026-06-18 (decision id 0f9fd367).
