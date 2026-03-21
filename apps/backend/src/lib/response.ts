export function ok<T>(data: T) {
  return { success: true as const, data }
}

export function fail(error: string) {
  return { success: false as const, error }
}
