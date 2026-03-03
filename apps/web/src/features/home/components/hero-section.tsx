import { Link } from 'react-router-dom'

function AppMockup() {
  const appointments = [
    { name: 'Mochi', species: 'Cat · Check-up', time: '9:00 AM' },
    { name: 'Bruno', species: 'Dog · Vaccination', time: '9:30 AM' },
    { name: 'Luna', species: 'Rabbit · Follow-up', time: '10:15 AM' },
  ]

  return (
    <div className="shadow-neo-xl w-full overflow-hidden rounded-[4px] border-2 border-ink bg-[#FEFAFF]">
      {/* Window chrome */}
      <div className="flex items-center gap-2 border-b-2 border-ink bg-ink px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-[#FF6B6B]" aria-hidden="true" />
        <span className="h-3 w-3 rounded-full bg-[#FAE8C7]" aria-hidden="true" />
        <span className="h-3 w-3 rounded-full bg-[#9979FF]" aria-hidden="true" />
        <span className="ml-3 font-sans text-xs font-semibold text-accent/60">
          shomer.app/dashboard
        </span>
      </div>

      {/* Dashboard content */}
      <div className="p-5 space-y-4">
        {/* Metric tiles */}
        <div className="grid grid-cols-2 gap-3">
          <div className="border-2 border-ink bg-accent p-4">
            <p className="font-sans text-[10px] font-semibold uppercase tracking-widest text-ink/60">
              Today
            </p>
            <p className="font-display text-3xl font-bold text-ink leading-none mt-1">12</p>
            <p className="font-sans text-xs font-semibold text-ink/70 mt-0.5">appointments</p>
          </div>
          <div className="border-2 border-ink bg-primary p-4">
            <p className="font-sans text-[10px] font-semibold uppercase tracking-widest text-accent/60">
              Patients
            </p>
            <p className="font-display text-3xl font-bold text-[#FEFAFF] leading-none mt-1">248</p>
            <p className="font-sans text-xs font-semibold text-accent/70 mt-0.5">active records</p>
          </div>
        </div>

        {/* Appointment list */}
        <div className="border-2 border-ink">
          <div className="border-b-2 border-ink px-4 py-2.5">
            <p className="font-sans text-[10px] font-semibold uppercase tracking-widest text-ink/60">
              Next Up
            </p>
          </div>
          {appointments.map((apt, i) => (
            <div
              key={apt.name}
              className={`flex items-center justify-between px-4 py-3 ${i < appointments.length - 1 ? 'border-b border-ink/15' : ''}`}
            >
              <div>
                <p className="font-sans text-xs font-bold text-ink">{apt.name}</p>
                <p className="font-sans text-[10px] text-ink/50">{apt.species}</p>
              </div>
              <span className="rounded-[2px] border border-primary/30 bg-primary/10 px-2 py-0.5 font-sans text-[10px] font-bold text-primary">
                {apt.time}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function HeroSection() {
  return (
    <section className="bg-dot-pattern bg-[#FEFAFF] border-b-2 border-ink px-6 py-20 md:py-28">
      <div className="mx-auto grid max-w-7xl gap-16 md:grid-cols-2 md:items-center">
        {/* Left: text */}
        <div className="flex flex-col gap-6">
          {/* Badge */}
          <div className="inline-flex w-fit items-center gap-2 rounded-full border-2 border-ink bg-[#FEFAFF] px-4 py-1.5 shadow-neo">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span className="font-sans text-xs font-bold uppercase tracking-widest text-ink">
              Now in Early Access
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-display text-6xl font-bold leading-none tracking-tight text-ink lg:text-7xl xl:text-8xl">
            Veterinary<br />
            Care,{' '}
            <span
              className="font-display"
              style={{ WebkitTextStroke: '2px #3B1F8C', color: 'transparent' }}
            >
              Simplified
            </span>
          </h1>

          {/* Subtext */}
          <p className="max-w-md font-sans text-base font-medium leading-relaxed text-ink/70">
            Shomer is the operating system for vet clinics — patient records, appointments, and care history in one place. Built for the whole team.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-4">
            <a
              href="#request-access"
              className="btn-neo shadow-neo-lg inline-flex items-center rounded-[4px] border-2 border-ink bg-ink px-7 py-3.5 font-sans text-sm font-bold text-accent"
            >
              Get Early Access
            </a>
            <Link
              to="/sign-in"
              className="btn-neo shadow-neo inline-flex items-center rounded-[4px] border-2 border-ink bg-[#FEFAFF] px-7 py-3.5 font-sans text-sm font-bold text-ink"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Right: app mockup */}
        <div className="w-full">
          <AppMockup />
        </div>
      </div>
    </section>
  )
}
