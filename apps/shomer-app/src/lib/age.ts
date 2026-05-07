/**
 * Compute age from a YYYY-MM-DD date of birth.
 * Returns null if dob is missing/invalid or in the future.
 *
 * Display rules:
 * - >= 1 year → "Xy" (years only)
 * - < 1 year → "Xm" (months)
 * - < 1 month → "Xd" (days)
 */
export function getAgeFromDob(dob: string | undefined | null): string | null {
  if (!dob) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob)
  if (!m) return null
  const [, y, mo, d] = m
  const birth = new Date(Number(y), Number(mo) - 1, Number(d))
  if (Number.isNaN(birth.getTime())) return null

  const now = new Date()
  if (birth > now) return null

  const years =
    now.getFullYear() -
    birth.getFullYear() -
    (now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
      ? 1
      : 0)

  if (years >= 1) return `${years}y`

  const months =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth()) -
    (now.getDate() < birth.getDate() ? 1 : 0)

  if (months >= 1) return `${months}m`

  const days = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24))
  return `${Math.max(0, days)}d`
}
