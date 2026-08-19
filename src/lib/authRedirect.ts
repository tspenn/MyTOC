export const TOC_PRODUCTION_ORIGIN = 'https://www.mytoc.app'

export function tocAppOrigin(): string {
  if (typeof window === 'undefined') return TOC_PRODUCTION_ORIGIN
  const origin = window.location.origin
  if (/localhost|127\.0\.0\.1/.test(origin)) return origin
  return TOC_PRODUCTION_ORIGIN
}

export function tocAuthRedirect(path: `/${string}`): string {
  return `${tocAppOrigin()}${path}`
}
