const SUPABASE_URL_PATTERN = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i

export function getSupabaseConfig() {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
  const issues: string[] = []

  if (!url) {
    issues.push('VITE_SUPABASE_URL is not set')
  } else if (!SUPABASE_URL_PATTERN.test(url)) {
    issues.push(
      'VITE_SUPABASE_URL must be your Supabase project URL (e.g. https://your-project.supabase.co)',
    )
  }

  if (!anonKey) {
    issues.push('VITE_SUPABASE_ANON_KEY is not set')
  } else if (!anonKey.startsWith('eyJ') && !anonKey.startsWith('sb_publishable_')) {
    issues.push('VITE_SUPABASE_ANON_KEY must be your anon or publishable key')
  }

  if (issues.length > 0) {
    return { ok: false as const, issues }
  }

  return { ok: true as const, url: url!, anonKey: anonKey! }
}
