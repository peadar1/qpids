import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Sign in with Google OAuth via Supabase Auth.
 * Redirects to Google's OAuth flow and then back to the callback URL.
 * @returns {Promise<Object>} Supabase auth response
 */
export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  })
  if (error) throw error
  return data
}

/**
 * Sign out from Supabase Auth.
 * @returns {Promise<void>}
 */
export const signOutFromSupabase = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

/**
 * Get the current Supabase Auth session.
 * @returns {Promise<Object|null>} Current session or null
 */
export const getSupabaseSession = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

/**
 * Get the current Supabase Auth user.
 * @returns {Promise<Object|null>} Current user or null
 */
export const getSupabaseUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/**
 * Listen for auth state changes.
 * @param {Function} callback - Called with (event, session) on auth changes
 * @returns {Object} Subscription object with unsubscribe method
 */
export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange(callback)
}
