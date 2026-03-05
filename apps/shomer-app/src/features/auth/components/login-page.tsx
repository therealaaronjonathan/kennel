import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useAuth } from '../hooks/use-auth'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const googleProvider = new GoogleAuthProvider()

function getFriendlyError(err: unknown): string | null {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code: string }).code
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Incorrect email or password.'
      case 'auth/too-many-requests':
        return 'Too many attempts. Try again in a moment.'
      case 'auth/user-disabled':
        return 'This account has been disabled.'
      case 'auth/popup-closed-by-user':
        return null
      case 'auth/network-request-failed':
        return 'Network error. Check your connection.'
      default:
        return 'Something went wrong. Please try again.'
    }
  }
  return 'Something went wrong. Please try again.'
}


function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  // Already authenticated — go straight to dashboard
  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, loading, navigate])

  async function handleEmailSignIn(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(getFriendlyError(err) ?? 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogleSignIn() {
    setError(null)
    setGoogleLoading(true)
    try {
      await signInWithPopup(auth, googleProvider)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const msg = getFriendlyError(err)
      if (msg) setError(msg) // silently ignore popup-closed-by-user
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">

      {/* ── Left panel — brand, desktop only, fully decorative ────────────── */}
      <div
        aria-hidden="true"
        className="hidden lg:flex lg:w-[420px] xl:w-[460px] flex-shrink-0 flex-col items-center justify-center gap-10 px-8"
        style={{ backgroundColor: '#9979FF' }}
      >
        <img
          src="/logos/shomer-full-icon.png"
          alt=""
          className="w-full h-auto object-contain select-none"
        />

        {/* Tagline — sentence case, no period, AA-compliant cream */}
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.14em] text-center"
          style={{ color: 'rgba(250, 232, 199, 0.82)' }}
        >
          Veterinary care, simplified
        </p>
      </div>

      {/* ── Right panel — form ────────────────────────────────────────────── */}
      <div className="flex flex-1 items-center justify-center bg-surface px-6 py-12">
        <div className="w-full max-w-[380px]">

          {/* Brand header */}
          <div
            className="mb-8 flex items-center gap-3 animate-fade-up"
            style={{ animationDelay: '0ms' }}
          >
            <img
              src="/logos/shomer-icon-beige.png"
              alt="Shomer"
              className="h-14 w-14 flex-shrink-0 rounded-[6px] object-contain select-none"
            />

            <div>
              <h1
                className="text-[22px] font-bold leading-none text-foreground"
                style={{ fontFamily: '"BC Alphapipe", Georgia, serif' }}
              >
                Shomer
              </h1>
              <p className="mt-1 text-[13px] font-semibold text-muted">
                Sign in to your clinic
              </p>
            </div>
          </div>

          {/* Card */}
          <div
            className="rounded-[4px] border bg-white px-7 py-6 animate-fade-up"
            style={{
              borderColor: 'rgba(26, 24, 37, 0.08)',
              animationDelay: '60ms',
            }}
          >
            {/* Email/password form */}
            <form onSubmit={handleEmailSignIn} noValidate className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@clinic.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                  className="text-[14px] h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="text-[14px] h-10"
                />
              </div>

              {/* Error — fades in when it appears */}
              {error && (
                <p role="alert" className="animate-fade-up text-[13px] font-semibold text-danger">
                  {error}
                </p>
              )}

              {/* 44px touch target */}
              <Button
                type="submit"
                variant="primary"
                className="w-full h-11 text-[14px] font-semibold mt-1"
                disabled={submitting || googleLoading}
              >
                {submitting ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t" style={{ borderColor: 'rgba(26, 24, 37, 0.08)' }} />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
                  or
                </span>
              </div>
            </div>

            {/* Google sign-in — 44px touch target */}
            <Button
              type="button"
              variant="ghost"
              className="w-full h-11 text-[14px] font-semibold"
              onClick={handleGoogleSignIn}
              disabled={submitting || googleLoading}
            >
              <GoogleIcon />
              {googleLoading ? 'Redirecting…' : 'Continue with Google'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
