/**
 * v1239 Slice 5 — lean sign-in state for the Planner (Supabase auth on the shared project).
 * The Planner has no org-setup wizard: after the first verified sign-in, plannerApi.ensureAccount()
 * creates the workspace server-side (SQL v1247 planner_create_account).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { platformDb } from '@nidus/supabase'

const AuthContext = createContext(null)

export function siteUrl(path = '') {
  return `${window.location.origin}${path}`
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    platformDb.auth.getSession().then(({ data }) => {
      if (alive) {
        setSession(data?.session || null)
        setLoading(false)
      }
    })
    const { data: sub } = platformDb.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => {
      alive = false
      sub?.subscription?.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email, password) => {
    const { error } = await platformDb.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message === 'Email not confirmed' ? 'Confirm your email first — check your inbox for the link.' : error.message)
  }, [])

  const signUp = useCallback(async ({ email, password, fullName }) => {
    const { data, error } = await platformDb.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, signup_product: 'planner' }, emailRedirectTo: siteUrl('/verify') },
    })
    if (error) throw new Error(error.message)
    return data
  }, [])

  const signOut = useCallback(async () => {
    await platformDb.auth.signOut()
  }, [])

  const sendReset = useCallback(async (email) => {
    const { error } = await platformDb.auth.resetPasswordForEmail(email, { redirectTo: siteUrl('/reset-password') })
    if (error) throw new Error(error.message)
  }, [])

  const updatePassword = useCallback(async (password) => {
    const { error } = await platformDb.auth.updateUser({ password })
    if (error) throw new Error(error.message)
  }, [])

  const value = useMemo(
    () => ({ session, user: session?.user || null, loading, signIn, signUp, signOut, sendReset, updatePassword }),
    [session, loading, signIn, signUp, signOut, sendReset, updatePassword]
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
