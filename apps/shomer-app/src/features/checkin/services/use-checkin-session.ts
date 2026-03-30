import { useState, useEffect, useRef } from 'react'
import type { CheckinFormData } from '../types'
import type { FlowStep } from '../components/checkin-page'

/*
 * Session persistence for the check-in wizard.
 *
 * State machine:
 *   search → found → checkin-form → confirmation
 *   search → register → checkin-form → confirmation
 *
 * Storage key is namespaced per branch so multi-branch receptionists
 * don't share state between branches.
 *
 * Uses useEffect (not useState initializer) to read from sessionStorage,
 * because clinicId/branchId may not be available on the first render.
 */

interface CheckinSession {
  step: FlowStep
  formInputs: CheckinFormData | null
}

const INITIAL: CheckinSession = { step: { type: 'search' }, formInputs: null }

export function useCheckinSession(
  clinicId: string | undefined,
  branchId: string | undefined,
) {
  const key =
    clinicId && branchId ? `checkin_session_${clinicId}_${branchId}` : null

  const [session, setSession] = useState<CheckinSession>(INITIAL)
  const restoredRef = useRef(false)

  // Read from sessionStorage once the key (clinicId + branchId) is available.
  // restoredRef prevents double-reads on subsequent renders.
  useEffect(() => {
    if (!key || restoredRef.current) return
    restoredRef.current = true
    try {
      const saved = sessionStorage.getItem(key)
      if (saved) setSession(JSON.parse(saved) as CheckinSession)
    } catch {
      // Malformed storage entry — start fresh
    }
  }, [key])

  function updateStep(step: FlowStep) {
    setSession((prev) => {
      const next: CheckinSession = { step, formInputs: prev.formInputs }
      if (key) try { sessionStorage.setItem(key, JSON.stringify(next)) } catch {}
      return next
    })
  }

  function updateFormInputs(formInputs: CheckinFormData) {
    setSession((prev) => {
      const next: CheckinSession = { step: prev.step, formInputs }
      if (key) try { sessionStorage.setItem(key, JSON.stringify(next)) } catch {}
      return next
    })
  }

  function clear() {
    if (key) try { sessionStorage.removeItem(key) } catch {}
    restoredRef.current = false
    setSession(INITIAL)
  }

  return { session, updateStep, updateFormInputs, clear }
}
