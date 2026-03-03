import { Link } from 'react-router-dom'

const footerLinks = {
  product: {
    heading: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'How It Works', href: '#how-it-works' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Changelog', href: '#changelog' },
    ],
  },
  company: {
    heading: 'Company',
    links: [
      { label: 'About', href: '#about' },
      { label: 'Blog', href: '#blog' },
      { label: 'Careers', href: '#careers' },
      { label: 'Contact', href: '#contact' },
    ],
  },
  legal: {
    heading: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '#privacy' },
      { label: 'Terms of Service', href: '#terms' },
      { label: 'Security', href: '#security' },
    ],
  },
}

// Simple social icon shapes
function XIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-4 w-4">
      <path d="M11.414 10L17 4.414 15.586 3 10 8.586 4.414 3 3 4.414 8.586 10 3 15.586 4.414 17 10 11.414 15.586 17 17 15.586z" />
    </svg>
  )
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-4 w-4">
      <path d="M5 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm0 5.5H3V17h2V8.5zM8 8.5h2v1.2C10.5 9 11.5 8.3 13 8.3c2.2 0 3.5 1.4 3.5 3.8V17h-2v-4.4c0-1.2-.5-2-1.7-2-1 0-1.8.7-1.8 2V17H8V8.5z" />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-4 w-4">
      <path fillRule="evenodd" d="M10 0C7.284 0 6.944.012 5.877.06 2.246.228.228 2.242.06 5.877.012 6.944 0 7.284 0 10s.012 3.057.06 4.123c.168 3.632 2.182 5.649 5.817 5.817C6.944 19.988 7.284 20 10 20s3.057-.012 4.123-.06c3.629-.168 5.652-2.182 5.817-5.817C19.988 13.057 20 12.716 20 10s-.012-3.056-.06-4.123C19.833 2.245 17.816.228 14.123.06 13.057.012 12.716 0 10 0zm0 1.802c2.67 0 2.986.01 4.04.058 2.71.123 3.977 1.409 4.1 4.1.048 1.054.058 1.37.058 4.04 0 2.672-.01 2.988-.058 4.042-.123 2.687-1.386 3.977-4.1 4.1-1.054.048-1.368.058-4.04.058-2.67 0-2.987-.01-4.04-.058-2.717-.124-3.977-1.416-4.1-4.1C1.81 12.988 1.8 12.67 1.8 10c0-2.67.01-2.986.058-4.04.124-2.69 1.387-3.977 4.1-4.1C6.013 1.812 6.33 1.802 10 1.802zm0 3.063a5.135 5.135 0 1 0 0 10.27 5.135 5.135 0 0 0 0-10.27zm0 8.468a3.333 3.333 0 1 1 0-6.666 3.333 3.333 0 0 1 0 6.666zm5.338-9.87a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z" clipRule="evenodd" />
    </svg>
  )
}

const socialLinks = [
  { label: 'X (Twitter)', href: '#', icon: XIcon },
  { label: 'LinkedIn', href: '#', icon: LinkedInIcon },
  { label: 'Instagram', href: 'https://www.instagram.com/', icon: InstagramIcon },
]

export function AppFooter() {
  return (
    <footer className="border-t border-ink bg-primary" aria-label="Site footer">
      {/* Main footer grid */}
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand column */}
          <div className="flex flex-col gap-5">
            <Link
              to="/"
              className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-[2px]"
              aria-label="Shomer — home"
            >
              <img
                src="/logos/shomer-icon-beige.png"
                alt=""
                aria-hidden="true"
                width="44"
                height="44"
                className="h-11 w-11 object-contain"
              />
              <span className="font-display text-2xl font-bold leading-none text-accent">shomer</span>
            </Link>
            <p className="font-sans text-sm font-medium leading-relaxed text-accent/70 max-w-[220px]">
              The operating system for modern veterinary clinics.
            </p>
            {/* Social icons */}
            <div className="flex items-center gap-3">
              {socialLinks.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="group inline-flex h-11 w-11 items-center justify-center border-4 border-[#7B5FD4] bg-[#7B5FD4] text-accent transition-colors duration-150 hover:border-accent hover:bg-accent hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.values(footerLinks).map(({ heading, links }) => (
            <div key={heading} className="flex flex-col gap-4">
              <h3 className="font-sans text-xs font-bold uppercase tracking-widest text-accent/50">
                {heading}
              </h3>
              <ul className="flex flex-col gap-3">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <a
                      href={href}
                      className="font-sans text-sm font-medium text-accent/80 transition-colors duration-100 hover:text-accent focus-visible:outline-none focus-visible:underline"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t-4 border-[#7B5FD4] px-6 py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 flex-wrap">
          <p className="font-sans text-xs font-medium text-accent/50">
            © 2026 Shomer. All rights reserved.
          </p>
          <p className="font-sans text-xs font-medium text-accent/40">
            Built for vets, by people who care.
          </p>
        </div>
      </div>
    </footer>
  )
}
