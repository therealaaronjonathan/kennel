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

function GithubIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-4 w-4">
      <path fillRule="evenodd" d="M10 0C4.5 0 0 4.5 0 10c0 4.4 2.9 8.1 6.8 9.5.5.1.7-.2.7-.5v-1.7C4.7 17.9 4.1 16 4.1 16c-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.3-1.1.6-1.3-2.2-.3-4.6-1.1-4.6-4.9 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.6 0 0 .8-.3 2.7 1a9.3 9.3 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.3.2 2.3.1 2.6.7.7 1 1.6 1 2.7 0 3.8-2.3 4.6-4.6 4.9.4.3.7 1 .7 2V19.5c0 .3.2.6.7.5C17.1 18.1 20 14.4 20 10 20 4.5 15.5 0 10 0z" clipRule="evenodd" />
    </svg>
  )
}

const socialLinks = [
  { label: 'X (Twitter)', href: '#', icon: XIcon },
  { label: 'LinkedIn', href: '#', icon: LinkedInIcon },
  { label: 'GitHub', href: '#', icon: GithubIcon },
]

export function AppFooter() {
  return (
    <footer className="border-t-2 border-ink bg-primary" aria-label="Site footer">
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
                width="32"
                height="32"
                className="h-8 w-8 object-contain"
              />
              <span className="font-display text-xl font-bold text-accent">shomer</span>
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
                  className="group inline-flex h-11 w-11 items-center justify-center border-2 border-[#7B5FD4] bg-[#7B5FD4] text-accent transition-colors duration-150 hover:border-accent hover:bg-accent hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
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
      <div className="border-t-2 border-[#7B5FD4] px-6 py-5">
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
