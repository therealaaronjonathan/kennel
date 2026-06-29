import { useEffect, useRef, useState } from 'react'
import type { ServiceEntry } from '@/components/blocks/services-select'

/*
 * Session persistence for an in-progress checkout (the edited service list)
 * so it survives navigating away (e.g. to Check-in) and back within the same
 * browser tab. Mirrors the check-in wizard's sessionStorage approach.
 *
 * Scoped per visit so each visit keeps its own draft. The CheckoutPanel is
 * keyed by visit.id and remounts per visit, so this hook initializes once per
 * visit — the lazy initializer reads that visit's draft (if any).
 *
 * The draft is intentionally NOT seeded until the user actually edits, so
 * merely opening a visit doesn't create a stale snapshot that would shadow a
 * later server-side change. Cleared on successful billing.
 */

const keyFor = (clinicId: string, branchId: string, visitId: string) =>
  `checkout_draft_${clinicId}_${branchId}_${visitId}`

export function useCheckoutDraft(
  clinicId: string,
  branchId: string,
  visitId: string,
  initialServices: ServiceEntry[],
) {
  const key = keyFor(clinicId, branchId, visitId)

  const [services, setServices] = useState<ServiceEntry[]>(() => {
    try {
      const saved = sessionStorage.getItem(key)
      if (saved) return JSON.parse(saved) as ServiceEntry[]
    } catch {
      // Malformed entry — start from the visit's services
    }
    return initialServices
  })

  // Persist on change. Skip the first run so simply viewing a visit doesn't
  // write a draft — only a real edit does.
  const firstRun = useRef(true)
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    try {
      sessionStorage.setItem(key, JSON.stringify(services))
    } catch {
      // Storage full / unavailable — best-effort, ignore
    }
  }, [key, services])

  function clearDraft() {
    try {
      sessionStorage.removeItem(key)
    } catch {
      // ignore
    }
  }

  return { services, setServices, clearDraft }
}
