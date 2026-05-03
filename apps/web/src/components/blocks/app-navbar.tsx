import { useState } from 'react'
import { Link } from 'react-router-dom'

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Get Access', href: '#request-access' },
]

export function AppNavbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="relative sticky top-0 z-50 h-20 w-full border-b-4 border-ink bg-[#FEFAFF]">
      <nav
        className="mx-auto flex h-full max-w-7xl items-center justify-between px-6"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <Link
          to="/"
          className="flex items-end gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 rounded-[2px]"
          aria-label="Shomer — home"
        >
          <img
            src="/logos/shomer-icon-beige.png"
            alt=""
            aria-hidden="true"
            width="64"
            height="64"
            className="h-16 w-16 flex-shrink-0 object-contain"
          />
          <span className="font-display text-5xl font-bold leading-none text-ink translate-y-0.5">shomer</span>
        </Link>

        {/* Center links — desktop only */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="font-sans text-sm font-semibold text-ink/70 transition-colors duration-100 hover:text-ink focus-visible:outline-none focus-visible:underline focus-visible:text-ink"
            >
              {label}
            </a>
          ))}
        </div>

        {/* Desktop CTA + mobile hamburger */}
        <div className="flex items-center gap-3">
          <a
            href="#request-access"
            className="btn-neo shadow-neo hidden md:inline-flex items-center border-4 border-ink bg-ink px-5 py-2.5 font-sans text-sm font-bold text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
          >
            Get Early Access
          </a>

          {/* Hamburger — mobile only */}
          <button
            type="button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen((o) => !o)}
            className="md:hidden inline-flex h-11 w-11 items-center justify-center border-4 border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
          >
            {menuOpen ? (
              /* X icon */
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M2 2L16 16M16 2L2 16" stroke="#3B1F8C" strokeWidth="2.5" strokeLinecap="square" />
              </svg>
            ) : (
              /* Hamburger icon */
              <svg width="20" height="14" viewBox="0 0 20 14" fill="none" aria-hidden="true">
                <path d="M0 1H20M0 7H20M0 13H20" stroke="#3B1F8C" strokeWidth="2.5" strokeLinecap="square" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile menu dropdown */}
      <div
        id="mobile-nav"
        className={`absolute left-0 right-0 top-full border-b-4 border-ink bg-[#FEFAFF] md:hidden transition-opacity duration-150 ${
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!menuOpen}
      >
        <div className="flex flex-col px-6 py-4 gap-1">
          {navLinks.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              onClick={() => setMenuOpen(false)}
              className="py-3 font-sans text-base font-semibold text-ink/80 transition-colors duration-100 hover:text-ink border-b border-ink/10 last:border-b-0 focus-visible:outline-none focus-visible:underline"
            >
              {label}
            </a>
          ))}
          <a
            href="#request-access"
            onClick={() => setMenuOpen(false)}
            className="mt-3 inline-flex h-11 w-full items-center justify-center border-4 border-ink bg-ink font-sans text-sm font-bold text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            Get Early Access
          </a>
        </div>
      </div>
    </header>
  )
}
