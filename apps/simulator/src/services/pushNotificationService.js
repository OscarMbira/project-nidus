import { platformDb } from './supabaseClient'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

/**
 * @returns {string|null}
 */
export function getVapidPublicKey() {
  const k = import.meta.env.VITE_VAPID_PUBLIC_KEY
  return typeof k === 'string' && k.trim().length > 0 ? k.trim() : null
}

/**
 * @returns {Promise<boolean>}
 */
export async function isPushSubscribed() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
  const reg = await navigator.serviceWorker.getRegistration()
  if (!reg) return false
  const sub = await reg.pushManager.getSubscription()
  return !!sub
}

/**
 * Subscribe the current device to web push and persist the subscription in Supabase.
 * @returns {Promise<PushSubscription|null>}
 */
export async function subscribeToPush() {
  const vapid = getVapidPublicKey()
  if (!vapid) {
    throw new Error('VITE_VAPID_PUBLIC_KEY is not configured.')
  }
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('You must be signed in to enable notifications.')

  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid),
    })
  }

  const json = sub.toJSON()
  const endpoint = json.endpoint
  const key = json.keys || {}
  const p256dh = key.p256dh || ''
  const auth = key.auth || ''

  const { error } = await platformDb.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh,
      auth,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' }
  )
  if (error) throw error
  return sub
}

/**
 * @returns {Promise<void>}
 */
export async function unsubscribeFromPush() {
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = reg ? await reg.pushManager.getSubscription() : null
  if (sub) {
    const endpoint = sub.endpoint
    await sub.unsubscribe()
    const { error } = await platformDb.from('push_subscriptions').delete().eq('endpoint', endpoint)
    if (error) throw error
  }
}
