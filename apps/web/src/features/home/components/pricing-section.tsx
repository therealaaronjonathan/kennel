import { useState } from 'react'

type Billing = 'monthly' | 'annual'

interface Tier {
  name: string
  target: string
  monthly: number | null
  annual: number | null
}

const tiers: Tier[] = [
  {
    name: 'Starter',
    target: 'Solo vet · 1 branch',
    monthly: 1499,
    annual: 14999,
  },
  {
    name: 'Clinic',
    target: '2–4 vets · 1 branch',
    monthly: 2999,
    annual: 29999,
  },
  {
    name: 'Multi-Branch',
    target: 'Chains · hospitals',
    monthly: 5999,
    annual: 59999,
  },
  {
    name: 'Enterprise',
    target: 'Large vet groups',
    monthly: null,
    annual: null,
  },
]

const cellBorders = [
  'border-b-4 border-ink sm:border-r-4 sm:border-ink lg:border-b-0',
  'border-b-4 border-ink lg:border-b-0 lg:border-r-4 lg:border-ink',
  'border-b-4 border-ink sm:border-b-0 sm:border-r-4 sm:border-ink',
  '',
]

const formatINR = (n: number) => `₹${n.toLocaleString('en-IN')}`

export function PricingSection() {
  const [billing, setBilling] = useState<Billing>('annual')

  return (
    <section
      id="pricing"
      className="border-b-4 border-ink bg-[#FEFAFF] px-6 py-24"
      aria-labelledby="pricing-heading"
    >
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-14 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <h2
            id="pricing-heading"
            className="font-display font-bold tracking-tight text-ink"
            style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)' }}
          >
            Simple pricing,<br />every clinic size
          </h2>
          <p className="max-w-xs font-sans text-base font-semibold text-ink/60 md:text-right">
            One platform. No hidden fees.<br />No setup costs.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="mb-12 flex justify-center">
          <div
            className="inline-flex items-stretch border-4 border-ink shadow-neo"
            role="group"
            aria-label="Billing period"
          >
            <button
              type="button"
              onClick={() => setBilling('monthly')}
              aria-pressed={billing === 'monthly'}
              className={`px-6 py-3 font-sans text-sm font-bold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 ${
                billing === 'monthly'
                  ? 'bg-ink text-accent'
                  : 'bg-[#FEFAFF] text-ink hover:bg-accent/40'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBilling('annual')}
              aria-pressed={billing === 'annual'}
              className={`flex items-center gap-2 border-l-4 border-ink px-6 py-3 font-sans text-sm font-bold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 ${
                billing === 'annual'
                  ? 'bg-ink text-accent'
                  : 'bg-[#FEFAFF] text-ink hover:bg-accent/40'
              }`}
            >
              Annual
              <span
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  billing === 'annual' ? 'text-accent/70' : 'text-ink/60'
                }`}
              >
                ~2 mo free
              </span>
            </button>
          </div>
        </div>

        {/* Pricing grid */}
        <div className="grid gap-0 border-4 border-ink shadow-neo-xl sm:grid-cols-2 lg:grid-cols-4">
          {tiers.map((tier, i) => {
            const isEnterprise = tier.monthly === null
            const primary = !isEnterprise
              ? billing === 'monthly'
                ? formatINR(tier.monthly!)
                : formatINR(tier.annual!)
              : 'Contact us'
            const primarySuffix = !isEnterprise
              ? billing === 'monthly'
                ? '/month'
                : '/year'
              : null
            const secondary = isEnterprise
              ? 'For large vet groups & hospitals.'
              : billing === 'monthly'
                ? `or ${formatINR(tier.annual!)} billed annually — save ~2 months`
                : `${formatINR(Math.round(tier.annual! / 12))}/mo equivalent`

            return (
              <div
                key={tier.name}
                className={`group relative flex flex-col p-8 transition-colors duration-150 hover:bg-ink hover:text-accent ${cellBorders[i]}`}
              >
                {/* Tier name */}
                <h3 className="font-display text-2xl font-bold tracking-tight text-ink transition-colors duration-150 group-hover:text-accent">
                  {tier.name}
                </h3>

                {/* Target descriptor */}
                <p className="mt-2 font-sans text-sm font-semibold text-ink/60 transition-colors duration-150 group-hover:text-accent/80">
                  {tier.target}
                </p>

                {/* Divider */}
                <div className="my-6 border-t-4 border-ink transition-colors duration-150 group-hover:border-accent" />

                {/* Primary price */}
                <div className="flex items-baseline gap-1">
                  <span
                    className="font-display font-bold tracking-tight text-ink transition-colors duration-150 group-hover:text-accent"
                    style={{ fontSize: 'clamp(2rem, 3.5vw, 2.75rem)' }}
                  >
                    {primary}
                  </span>
                  {primarySuffix && (
                    <span className="font-sans text-base font-semibold text-ink/60 transition-colors duration-150 group-hover:text-accent/80">
                      {primarySuffix}
                    </span>
                  )}
                </div>

                {/* Secondary line */}
                <p className="mt-3 font-sans text-sm font-semibold leading-relaxed text-ink/60 transition-colors duration-150 group-hover:text-accent/80">
                  {secondary}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
