import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from './env'

let client: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (client) return client

  const config = getSupabaseConfig()
  if (!config.ok) {
    throw new Error(`Invalid Supabase config: ${config.issues.join('; ')}`)
  }

  client = createClient(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })

  return client
}

// Lazy proxy so importing modules does not crash before React renders.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const instance = getSupabaseClient()
    const value = instance[prop as keyof SupabaseClient]
    return typeof value === 'function' ? value.bind(instance) : value
  },
})
