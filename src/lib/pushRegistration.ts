/**
 * MyTOC Web Push ("notifications" / Ping) — not SMS/Twilio.
 * Subscriptions use shared user_push_subscriptions with app_id = chkchk (legacy backend id).
 */
import { supabase } from './supabase'

const APP_ID = 'chkchk'

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(b64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

async function resolveVapidPublicKey(): Promise<string | null> {
  const fromEnv = (import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY as string | undefined)?.trim()
  if (fromEnv) return fromEnv

  const { data, error } = await supabase.functions.invoke('web-push-public-key')
  if (error || !data?.publicKey) {
    console.warn('Could not load web push public key', error)
    return null
  }
  return String(data.publicKey)
}

export async function currentPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission
}

export async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  const existing = await navigator.serviceWorker.getRegistration()
  if (existing) return existing
  return navigator.serviceWorker.register('/sw.js')
}

export async function requestPermissionAndSubscribe(): Promise<'granted' | 'denied' | 'error'> {
  if (!isPushSupported()) return 'error'

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return 'denied'

    const vapidKey = await resolveVapidPublicKey()
    if (!vapidKey) return 'error'

    const reg = await ensureServiceWorker()
    if (!reg) return 'error'
    await navigator.serviceWorker.ready

    const existing = await reg.pushManager.getSubscription()
    const sub =
      existing ||
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      }))

    const json = sub.toJSON()
    const endpoint = json.endpoint
    const p256dh = json.keys?.p256dh
    const auth = json.keys?.auth
    if (!endpoint || !p256dh || !auth) return 'error'

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 'error'

    const { error } = await supabase.from('user_push_subscriptions').upsert(
      {
        user_id: user.id,
        endpoint,
        p256dh,
        auth,
        user_agent: navigator.userAgent,
        is_active: true,
        app_id: APP_ID,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' },
    )

    return error ? 'error' : 'granted'
  } catch (e) {
    console.warn('Push subscribe failed', e)
    return 'error'
  }
}

export async function unsubscribePush(): Promise<void> {
  if (!isPushSupported()) return
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (!sub) return

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('user_push_subscriptions')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('endpoint', sub.endpoint)
        .eq('app_id', APP_ID)
    }
    await sub.unsubscribe()
  } catch {
    // best-effort
  }
}

export async function hasActiveChkchkSubscription(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { count } = await supabase
    .from('user_push_subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('app_id', APP_ID)
    .eq('is_active', true)
  return (count ?? 0) > 0
}
