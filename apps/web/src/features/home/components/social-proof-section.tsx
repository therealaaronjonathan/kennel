const clinics = [
  'Companion Animal Clinic',
  'Sunrise Veterinary',
  'PetCare Plus',
  'Happy Paws Animal Hospital',
  'CityVet',
  'Woodland Animal Clinic',
  'Metro Pet Care',
  'Golden Gate Veterinary',
  'Paws & Claws',
  'Village Animal Hospital',
]

export function SocialProofSection() {
  const items = [...clinics, ...clinics]

  return (
    <div className="overflow-hidden border-b-2 border-ink bg-primary py-5">
      {/* Screen-reader summary of the marquee content */}
      <p className="sr-only">
        Trusted by clinics including: {clinics.join(', ')}.
      </p>

      {/* Decorative animated marquee — hidden from assistive tech */}
      <div className="animate-marquee flex whitespace-nowrap" aria-hidden="true">
        {items.map((name, i) => (
          <span
            key={i}
            className="mx-10 font-display text-sm font-bold uppercase tracking-widest text-accent/60"
          >
            {name}
            <span className="ml-10 text-accent/30">·</span>
          </span>
        ))}
      </div>
    </div>
  )
}
