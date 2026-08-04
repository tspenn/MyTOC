export function isRlsError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  return error.code === '42501' || error.message?.toLowerCase().includes('permission') === true
}

export function isNetworkError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const message = 'message' in error && typeof error.message === 'string' ? error.message : ''
  return message.toLowerCase().includes('fetch') || message.toLowerCase().includes('network')
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: { retries?: number; baseDelayMs?: number } = {},
): Promise<T> {
  const { retries = 3, baseDelayMs = 400 } = options
  let lastError: unknown

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      if (attempt === retries || !isNetworkError(error)) {
        throw error
      }
      const delay = baseDelayMs * 2 ** attempt
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}
