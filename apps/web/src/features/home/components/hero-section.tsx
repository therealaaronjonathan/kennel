function AppMockup() {
  const appointments = [
    { name: 'Mochi', species: 'Cat · Check-up', time: '9:00 AM' },
    { name: 'Bruno', species: 'Dog · Vaccination', time: '9:30 AM' },
    { name: 'Luna', species: 'Rabbit · Follow-up', time: '10:15 AM' },
  ]

  return (
    <div className="shadow-neo-xl w-full overflow-hidden border-4 border-ink bg-[#FEFAFF]">
      {/* Window chrome */}
      <div className="flex items-center gap-2 border-b-4 border-ink bg-ink px-4 py-3">
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
          <div className="border-4 border-ink bg-accent p-4">
            <p className="font-sans text-[10px] font-bold uppercase tracking-widest text-ink/60">
              Today
            </p>
            <p className="font-display text-4xl font-bold text-ink leading-none mt-1">12</p>
            <p className="font-sans text-xs font-bold text-ink/70 mt-0.5">appointments</p>
          </div>
          <div className="border-4 border-ink bg-primary p-4">
            <p className="font-sans text-[10px] font-bold uppercase tracking-widest text-accent/60">
              Patients
            </p>
            <p className="font-display text-4xl font-bold text-[#FEFAFF] leading-none mt-1">248</p>
            <p className="font-sans text-xs font-bold text-accent/70 mt-0.5">active records</p>
          </div>
        </div>

        {/* Appointment list */}
        <div className="border-4 border-ink">
          <div className="border-b-4 border-ink px-4 py-2.5 bg-ink/5">
            <p className="font-sans text-[10px] font-bold uppercase tracking-widest text-ink/60">
              Next Up
            </p>
          </div>
          {appointments.map((apt, i) => (
            <div
              key={apt.name}
              className={`flex items-center justify-between px-4 py-3 ${i < appointments.length - 1 ? 'border-b-2 border-ink/20' : ''}`}
            >
              <div>
                <p className="font-sans text-xs font-bold text-ink">{apt.name}</p>
                <p className="font-sans text-[10px] text-ink/50">{apt.species}</p>
              </div>
              <span className="border-2 border-primary bg-primary/10 px-2 py-0.5 font-sans text-[10px] font-bold text-primary">
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
    <section className="bg-dot-pattern bg-[#FEFAFF] border-b-4 border-ink px-6 py-20 md:py-28">
      <div className="mx-auto grid max-w-7xl gap-16 md:grid-cols-2 md:items-center">
        {/* Left: text */}
        <div className="hero-stagger flex flex-col gap-7">
          {/* Badge — sharp, not pill */}
          <div className="inline-flex w-fit items-center gap-2.5 border-4 border-ink bg-accent px-4 py-2 shadow-neo">
            <span className="h-2.5 w-2.5 bg-ink" aria-hidden="true" />
            <span className="font-sans text-xs font-bold uppercase tracking-widest text-ink">
              Now in Early Access
            </span>
          </div>

          {/* Headline — fluid, massive */}
          <h1
            className="font-display font-bold leading-none tracking-tight text-ink"
            style={{ fontSize: 'clamp(3.5rem, 8vw, 8rem)' }}
          >
            Veterinary<br />
            Clinics,{' '}
            <span
              className="font-display"
              style={{ WebkitTextStroke: '3px #3B1F8C', color: 'transparent' }}
            >
              Simplified
            </span>
          </h1>

          {/* Subtext */}
          <p className="max-w-md font-sans text-base font-semibold leading-relaxed text-ink/70">
            <span className="font-sans text-sm font-bold text-ink/60 italic">pronounced: shoh-mer&nbsp;&nbsp;·&nbsp;&nbsp;</span>
            Shomer is the operating system for vet clinics — queue management, patient records, and billing in one place. Built for the whole team.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-4">
            <a
              href="#request-access"
              className="inline-flex items-center border-4 border-ink bg-ink px-8 py-4 font-sans text-base font-bold text-accent"
            >
              Get Early Access
            </a>
            <a
              href="https://shomer.app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center border-4 border-ink bg-[#FEFAFF] px-8 py-4 font-sans text-base font-bold text-ink"
            >
              Sign In
            </a>
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
