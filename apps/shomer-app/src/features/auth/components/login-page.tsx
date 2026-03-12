import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  type UserCredential,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { useAuth } from '../hooks/use-auth'
import { useClinic } from '@/features/clinic'
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

async function getDestination(uid: string): Promise<string> {
  try {
    const snap = await getDoc(doc(db, 'staff', uid))
    if (snap.exists() && snap.data().doctorId) return '/vet'
  } catch {
    // fall through to default
  }
  return '/dashboard'
}

export function LoginPage() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const { doctorId, loading: clinicLoading } = useClinic()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  // Already authenticated — redirect based on role once clinic data is ready
  useEffect(() => {
    if (!loading && !clinicLoading && user) {
      navigate(doctorId ? '/vet' : '/dashboard', { replace: true })
    }
  }, [user, loading, clinicLoading, doctorId, navigate])

  async function redirectAfterSignIn(cred: UserCredential) {
    const dest = await getDestination(cred.user.uid)
    navigate(dest, { replace: true })
  }

  async function handleEmailSignIn(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      await redirectAfterSignIn(cred)
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
      const cred = await signInWithPopup(auth, googleProvider)
      await redirectAfterSignIn(cred)
    } catch (err) {
      const msg = getFriendlyError(err)
      if (msg) setError(msg) // silently ignore popup-closed-by-user
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">

      {/* ── Left panel — editorial brand statement ────────────────────────── */}
      <div
        aria-hidden="true"
        className="hidden lg:flex lg:w-[420px] xl:w-[480px] flex-shrink-0 flex-col justify-between px-12 py-14 relative overflow-hidden"
        style={{
          backgroundColor: '#9979FF',
          backgroundImage: 'repeating-linear-gradient(-45deg, rgba(250,232,199,0.05) 0px, rgba(250,232,199,0.05) 1px, transparent 1px, transparent 32px)',
        }}
      >
        {/* Top: staff + textmark logo */}
        <img
          src="/logos/shomer-full-icon.png"
          alt=""
          className="h-20 w-auto object-contain object-left select-none -ml-3"
        />

        {/* Middle: bold statement */}
        <div>
          <div
            className="mb-7 h-px w-12"
            style={{ backgroundColor: 'rgba(250, 232, 199, 0.4)' }}
          />
          <p
            className="text-[46px] xl:text-[54px] font-bold leading-[1.05] mb-5"
            style={{ fontFamily: '"BC Alphapipe", Georgia, serif', color: '#FAE8C7' }}
          >
            Your clinic,<br />simplified.
          </p>
          <p
            className="text-[14px] font-semibold"
            style={{ color: 'rgba(250, 232, 199, 0.55)' }}
          >
            The operating system for modern pet-clinics.
          </p>
        </div>

        {/* Bottom: byline */}
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.12em]"
          style={{ color: 'rgba(250, 232, 199, 0.35)' }}
        >
          Shomer © 2026
        </p>
      </div>

      {/* ── Right panel — light theme form ───────────────────────────────── */}
      <div
        className="flex flex-1 items-center justify-center px-8 py-12"
        style={{ backgroundColor: '#FEFAFF' }}
      >
        <div className="w-full max-w-[380px]">

          {/* Mobile logo — hidden on desktop */}
          <div className="lg:hidden mb-10 animate-fade-up">
            <img
              src="/logos/shomer-full-icon.png"
              alt="Shomer"
              className="h-10 w-auto object-contain object-left select-none -ml-1"
            />
          </div>

          {/* Heading */}
          <div
            className="mb-10 animate-fade-up"
            style={{ animationDelay: '0ms' }}
          >
            <h1
              className="text-[58px] xl:text-[66px] font-bold leading-none mb-3"
              style={{ fontFamily: '"BC Alphapipe", Georgia, serif', color: '#1A1825' }}
            >
              Sign in.
            </h1>
            <p
              className="text-[14px] font-semibold"
              style={{ color: '#6B6478' }}
            >
              Access your clinic's workspace
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleEmailSignIn}
            noValidate
            className="space-y-6 animate-fade-up"
            style={{ animationDelay: '80ms' }}
          >
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-[11px] font-semibold uppercase tracking-[0.1em]"
                style={{ color: '#6B6478' }}
              >
                Email
              </Label>
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
                className="text-[14px] h-12"
                style={{
                  backgroundColor: '#ffffff',
                  borderColor: 'rgba(26, 24, 37, 0.14)',
                  color: '#1A1825',
                }}
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-[11px] font-semibold uppercase tracking-[0.1em]"
                style={{ color: '#6B6478' }}
              >
                Password
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="text-[14px] h-12"
                style={{
                  backgroundColor: '#ffffff',
                  borderColor: 'rgba(26, 24, 37, 0.14)',
                  color: '#1A1825',
                }}
              />
            </div>

            {/* Error */}
            {error && (
              <p role="alert" className="animate-fade-up text-[13px] font-semibold text-danger">
                {error}
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full h-12 text-[14px] font-bold mt-1"
              disabled={submitting || googleLoading}
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          {/* Divider */}
          <div
            className="relative my-6 animate-fade-up"
            style={{ animationDelay: '140ms' }}
          >
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t" style={{ borderColor: 'rgba(26, 24, 37, 0.08)' }} />
            </div>
            <div className="relative flex justify-center">
              <span
                className="px-3 text-[11px] font-semibold uppercase tracking-[0.06em]"
                style={{ backgroundColor: '#FEFAFF', color: '#6B6478' }}
              >
                or
              </span>
            </div>
          </div>

          {/* Google sign-in */}
          <Button
            type="button"
            variant="ghost"
            className="w-full h-12 text-[14px] font-semibold animate-fade-up"
            style={{ animationDelay: '160ms' }}
            onClick={handleGoogleSignIn}
            disabled={submitting || googleLoading}
          >
            <GoogleIcon />
            {googleLoading ? 'Redirecting…' : 'Continue with Google'}
          </Button>
        </div>
      </div>
    </div>
  )
}
