import { Calendar, ClipboardList, FileHeart, Users, Bell, Lock } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Feature {
  icon: LucideIcon
  title: string
  description: string
}

const features: Feature[] = [
  {
    icon: FileHeart,
    title: 'Patient Records',
    description: 'Complete medical profiles for every pet — breed, weight, vaccination history, and allergies always at hand.',
  },
  {
    icon: Calendar,
    title: 'Queue Management',
    description: 'Manage walk-ins and clinic crowds in real time — see who\'s next, track wait times, and keep your front desk in control.',
  },
  {
    icon: ClipboardList,
    title: 'Track Pet History',
    description: 'A complete timeline of every visit, diagnosis, and treatment — so any team member can pick up right where the last vet left off.',
  },
  {
    icon: Users,
    title: 'Multi-Role Access',
    description: 'Separate tailored views for veterinarians and receptionists — everyone sees exactly what they need.',
  },
  {
    icon: Bell,
    title: 'Smart Reminders',
    description: 'Automated follow-up reminders for vaccinations, medications, and next visits keep pet-care on track.',
  },
  {
    icon: Lock,
    title: 'Secure & Compliant',
    description: 'Patient data is protected with role-based access controls and encrypted at rest and in transit.',
  },
]

export function FeaturesSection() {
  return (
    <section
      id="features"
      className="border-b-4 border-ink bg-[#FEFAFF] px-6 py-24"
      aria-labelledby="features-heading"
    >
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-14 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <h2
            id="features-heading"
            className="font-display font-bold tracking-tight text-ink"
            style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)' }}
          >
            Everything your<br />clinic needs
          </h2>
          <p className="max-w-xs font-sans text-base font-semibold text-ink/60 md:text-right">
            One platform, every workflow.<br />No spreadsheets, no paper charts.
          </p>
        </div>

        {/* Grid — border-4 frame, thick inner dividers */}
        <div className="grid gap-0 border-4 border-ink shadow-neo-xl sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => {
            const Icon = feature.icon
            const cellBorders = [
              'sm:border-r-4 sm:border-ink border-b-4 border-ink',
              'lg:border-r-4 lg:border-ink border-b-4 border-ink',
              'sm:border-r-4 sm:border-ink lg:border-r-0 border-b-4 border-ink',
              'lg:border-r-4 lg:border-ink border-b-4 border-ink lg:border-b-0',
              'sm:border-r-4 sm:border-ink border-b-4 border-ink sm:border-b-0',
              '',
            ]
            return (
              <div
                key={feature.title}
                className={`group relative p-8 transition-colors duration-150 hover:bg-ink hover:text-accent ${cellBorders[i]}`}
              >
                {/* Icon box */}
                <div className="mb-6 inline-flex h-14 w-14 items-center justify-center border-4 border-ink bg-accent transition-colors duration-150 group-hover:bg-primary group-hover:border-accent">
                  <Icon
                    className="h-6 w-6 text-ink transition-colors duration-150 group-hover:text-accent"
                    strokeWidth={2.5}
                    aria-hidden="true"
                  />
                </div>
                <h3 className="mb-3 font-display text-xl font-bold tracking-tight text-ink transition-colors duration-150 group-hover:text-accent">
                  {feature.title}
                </h3>
                <p className="font-sans text-base font-semibold leading-relaxed text-ink/60 transition-colors duration-150 group-hover:text-accent/80">
                  {feature.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
