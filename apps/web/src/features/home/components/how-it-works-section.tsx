const steps = [
  {
    number: '01',
    title: 'Set up your clinic',
    description: 'Create your clinic profile and invite your team. Assign roles to vets and reception staff in minutes.',
    color: 'accent' as const,
  },
  {
    number: '02',
    title: 'Add your patients',
    description: 'Import existing records or start fresh. Build complete profiles for every patient from day one.',
    color: 'white' as const,
  },
  {
    number: '03',
    title: 'Run your day',
    description: 'Schedule appointments, log visits, track prescriptions, and access the full care history instantly.',
    color: 'ink' as const,
  },
]

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="border-b-2 border-ink bg-primary px-6 py-20"
      aria-labelledby="how-heading"
    >
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-14 text-center">
          <p className="mb-3 font-sans text-xs font-bold uppercase tracking-widest text-accent/60">
            How It Works
          </p>
          <h2
            id="how-heading"
            className="font-display text-4xl font-bold tracking-tight text-accent md:text-5xl"
          >
            Up and running in minutes
          </h2>
        </div>

        {/* Steps */}
        <div className="relative grid gap-8 md:grid-cols-3">
          {/* Connector line (desktop) */}
          <div
            className="absolute left-0 right-0 top-8 hidden h-0.5 bg-[#7B5FD4] md:block"
            style={{ top: '2rem', left: '16.66%', right: '16.66%' }}
            aria-hidden="true"
          />

          {steps.map((step) => {
            const stepColor =
              step.color === 'accent' ? '#FAE8C7' :
              step.color === 'white' ? '#FEFAFF' :
              '#3B1F8C'

            return (
              <div key={step.number} className="flex flex-col items-center gap-5 text-center">
                {/* Step circle */}
                <div
                  className="relative z-10 flex h-16 w-16 items-center justify-center bg-primary"
                  style={{ border: `4px solid ${stepColor}` }}
                >
                  <span
                    className="font-display text-xl font-bold"
                    style={{ color: stepColor }}
                  >
                    {step.number}
                  </span>
                </div>

                {/* Content */}
                <div className="max-w-xs">
                  <h3 className="mb-2 font-display text-xl font-bold tracking-tight text-accent">
                    {step.title}
                  </h3>
                  <p className="font-sans text-sm font-medium leading-relaxed text-accent/60">
                    {step.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
