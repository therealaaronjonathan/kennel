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
    title: 'Appointment Scheduling',
    description: 'Book and manage appointments with a clear calendar built for high-volume clinic workflows.',
  },
  {
    icon: ClipboardList,
    title: 'Care History',
    description: 'A structured timeline of every visit, procedure, and prescription your whole team can access instantly.',
  },
  {
    icon: Users,
    title: 'Multi-Role Access',
    description: 'Separate tailored views for veterinarians and receptionists — everyone sees exactly what they need.',
  },
  {
    icon: Bell,
    title: 'Smart Reminders',
    description: 'Automated follow-up reminders for vaccinations, medications, and next visits keep care on track.',
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
      className="border-b-2 border-ink bg-[#FEFAFF] px-6 py-20"
      aria-labelledby="features-heading"
    >
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-12 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <h2
            id="features-heading"
            className="font-display text-4xl font-bold tracking-tight text-ink md:text-5xl"
          >
            Everything your<br />clinic needs
          </h2>
          <p className="max-w-xs font-sans text-sm font-medium text-ink/60 md:text-right">
            One platform, every workflow. No spreadsheets, no paper charts.
          </p>
        </div>

        {/* 3-column grid — outer border on container, inner dividers per cell */}
        {/* Right border: lg col 1+2 (not col 3); sm col 1 (not col 2); none on mobile        */}
        {/* Bottom border: mobile all-but-last; sm all-but-last-2; lg first row only (0-2)    */}
        <div className="grid gap-0 border-2 border-ink sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => {
            const Icon = feature.icon
            // Per-cell border classes derived for a 6-item, 2-row grid
            const cellBorders = [
              /* 0 lg-col1 sm-col1 row1 */ 'sm:border-r-2 sm:border-ink border-b-2 border-ink',
              /* 1 lg-col2 sm-col2 row1 */ 'lg:border-r-2 lg:border-ink border-b-2 border-ink',
              /* 2 lg-col3 sm-col1 row1 */ 'sm:border-r-2 sm:border-ink lg:border-r-0 border-b-2 border-ink',
              /* 3 lg-col1 sm-col2 row2 */ 'lg:border-r-2 lg:border-ink border-b-2 border-ink lg:border-b-0',
              /* 4 lg-col2 sm-col1 row2 */ 'sm:border-r-2 sm:border-ink border-b-2 border-ink sm:border-b-0',
              /* 5 lg-col3 sm-col2 row2 */ '',
            ]
            return (
              <div
                key={feature.title}
                className={`group relative p-8 transition-colors duration-150 hover:bg-accent/20 ${cellBorders[i]}`}
              >
                {/* Icon box */}
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center border-2 border-ink bg-accent transition-colors duration-150 group-hover:bg-primary">
                  <Icon
                    className="h-5 w-5 text-ink transition-colors duration-150 group-hover:text-[#FEFAFF]"
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                </div>
                <h3 className="mb-2 font-display text-xl font-bold tracking-tight text-ink">
                  {feature.title}
                </h3>
                <p className="font-sans text-sm font-medium leading-relaxed text-ink/60">
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
