import { useState } from 'react'

interface FormState {
  name: string
  email: string
  clinicName: string
  phone: string
}

const defaultForm: FormState = { name: '', email: '', clinicName: '', phone: '' }

export function ContactSection() {
  const [form, setForm] = useState<FormState>(defaultForm)
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: wire up to POST /api/contact or email service
    setSubmitted(true)
  }

  return (
    <section
      id="request-access"
      className="bg-dot-pattern bg-[#FEFAFF] border-b-2 border-ink px-6 py-20"
      aria-labelledby="contact-heading"
    >
      <div className="mx-auto max-w-xl">
        {/* Section header */}
        <div className="mb-10 text-center">
          <p className="mb-3 font-sans text-xs font-bold uppercase tracking-widest text-ink/50">
            Limited Early Access
          </p>
          <h2
            id="contact-heading"
            className="font-display text-4xl font-bold tracking-tight text-ink md:text-5xl"
          >
            Get Early Access
          </h2>
          <p className="mt-4 font-sans text-sm font-medium leading-relaxed text-ink/60">
            Shomer is currently invite-only. Tell us about your clinic and we'll be in touch.
          </p>
        </div>

        {/* Form card */}
        <div className="border-2 border-ink bg-[#FEFAFF] shadow-neo-xl p-8">
          {submitted ? (
            <div
              role="status"
              aria-live="polite"
              className="py-10 text-center"
            >
              {/* Success icon */}
              <div className="mb-5 inline-flex h-16 w-16 items-center justify-center border-2 border-ink bg-accent shadow-neo">
                <svg
                  className="h-7 w-7 text-ink"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-display text-2xl font-bold tracking-tight text-ink">
                You're on the list!
              </p>
              <p className="mt-2 font-sans text-sm font-medium text-ink/60">
                We'll reach out to the email you provided shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="name"
                    className="font-sans text-sm font-bold text-ink"
                  >
                    Full Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Jane Smith"
                    value={form.name}
                    onChange={handleChange}
                    required
                    className="h-11 w-full border-2 border-ink bg-[#FEFAFF] px-3 font-sans text-sm font-medium text-ink placeholder:text-ink/30 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-colors duration-100"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="email"
                    className="font-sans text-sm font-bold text-ink"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="jane@vetclinic.com"
                    value={form.email}
                    onChange={handleChange}
                    required
                    className="h-11 w-full border-2 border-ink bg-[#FEFAFF] px-3 font-sans text-sm font-medium text-ink placeholder:text-ink/30 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-colors duration-100"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="clinicName"
                  className="font-sans text-sm font-bold text-ink"
                >
                  Clinic Name
                </label>
                <input
                  id="clinicName"
                  name="clinicName"
                  type="text"
                  autoComplete="organization"
                  placeholder="Paws & Care Veterinary"
                  value={form.clinicName}
                  onChange={handleChange}
                  required
                  className="h-11 w-full border-2 border-ink bg-[#FEFAFF] px-3 font-sans text-sm font-medium text-ink placeholder:text-ink/30 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-colors duration-100"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="phone"
                  className="font-sans text-sm font-bold text-ink"
                >
                  Phone Number{' '}
                  <span className="font-normal text-ink/40">(optional)</span>
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+1 (555) 000-0000"
                  value={form.phone}
                  onChange={handleChange}
                  className="h-11 w-full border-2 border-ink bg-[#FEFAFF] px-3 font-sans text-sm font-medium text-ink placeholder:text-ink/30 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-colors duration-100"
                />
              </div>

              <button
                type="submit"
                className="btn-neo shadow-neo-lg mt-2 inline-flex h-12 w-full items-center justify-center border-2 border-ink bg-ink font-sans text-sm font-bold text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
              >
                Request Early Access
              </button>

              <p className="text-center font-sans text-xs font-medium text-ink/40">
                No credit card required. We'll reach out within 48 hours.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
