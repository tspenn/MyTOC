import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

export type PushPermission = 'default' | 'granted' | 'denied' | 'unsupported'

export function useWebPush() {
  const { isAuthenticated, user } = useAuth()
  const [permission, setPermission] = useState<PushPermission>('default')
  const [saving,     setSaving]     = useState(false)

  const supported =
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    Boolean(VAPID_PUBLIC_KEY)

  useEffect(() => {
    if (!supported) { setPermission('unsupported'); return }
    setPermission(Notification.permission as PushPermission)
  }, [supported])

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!supported || !isAuthenticated || !user || !VAPID_PUBLIC_KEY) return false

    setSaving(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const { error } = await supabase
        .from('chkchk_push_subscriptions')
        .upsert(
          { user_id: user.id, subscription: sub.toJSON() },
          { onConflict: 'user_id' },
        )

      if (error) throw error
      setPermission('granted')
      return true
    } catch (err) {
      console.warn('Push subscribe failed:', err)
      return false
    } finally {
      setSaving(false)
    }
  }, [supported, isAuthenticated, user])

  const requestPermission = useCallback(async (): Promise<PushPermission> => {
    if (!supported) return 'unsupported'
    const result = await Notification.requestPermission()
    setPermission(result as PushPermission)
    if (result === 'granted') await subscribe()
    return result as PushPermission
  }, [supported, subscribe])

  return { supported, permission, saving, requestPermission, subscribe }
}
