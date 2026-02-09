import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import api from '../services/api';

const AuthContext = createContext(null);

/**
 * Unified authentication provider using Supabase Auth.
 *
 * This provider handles both organizer (matcher) and participant authentication
 * using a single Supabase Auth session with role-based access control.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  /**
   * Fetch user data from backend using Supabase token.
   * Creates user in backend if first login.
   */
  const fetchUser = useCallback(async (accessToken) => {
    try {
      const { data } = await api.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setUser(data);
      return data;
    } catch (error) {
      console.error('Failed to fetch user:', error);
      setUser(null);
      return null;
    }
  }, []);

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);

        if (currentSession?.access_token) {
          await fetchUser(currentSession.access_token);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);

        if (event === 'SIGNED_IN' && newSession) {
          await fetchUser(newSession.access_token);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        } else if (event === 'TOKEN_REFRESHED' && newSession) {
          // Supabase auto-refreshes tokens, just update session
          // No need to re-fetch user, the new token will work
        }
      }
    );

    return () => subscription?.unsubscribe();
  }, [fetchUser]);

  /**
   * Sign in with Google OAuth.
   * Redirects to Google and then to the callback URL.
   * @param {string} redirectTo - Path to redirect after auth (default: '/')
   */
  const signInWithGoogle = async (redirectTo = '/') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`
      }
    });
    if (error) throw error;
  };

  /**
   * Sign in with email and password.
   * @param {string} email - User email
   * @param {string} password - User password
   */
  const signInWithEmail = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  /**
   * Sign up with email and password.
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {Object} metadata - Additional user metadata (name, etc.)
   */
  const signUpWithEmail = async (email, password, metadata = {}) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata }
    });
    if (error) throw error;
  };

  /**
   * Sign out from both Supabase Auth and clear local state.
   */
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  /**
   * Upgrade current user to matcher role.
   * Allows participants to create and manage events.
   */
  const upgradeToMatcher = async () => {
    if (!session?.access_token) {
      throw new Error('Must be authenticated to upgrade');
    }

    const { data } = await api.post('/api/auth/upgrade-to-matcher', {}, {
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    setUser(data);
    return data;
  };

  /**
   * Update current user profile.
   * @param {Object} updates - Profile fields to update
   */
  const updateProfile = async (updates) => {
    if (!session?.access_token) {
      throw new Error('Must be authenticated to update profile');
    }

    const { data } = await api.put('/api/auth/me', updates, {
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    setUser(data);
    return data;
  };

  /**
   * Check if user has a specific role.
   * @param {string} role - Role to check ('matcher' or 'participant')
   * @returns {boolean}
   */
  const hasRole = (role) => user?.roles?.includes(role) ?? false;

  const value = {
    // User state
    user,
    session,
    loading,
    isAuthenticated: !!session,

    // Role helpers
    isMatcher: hasRole('matcher'),
    isParticipant: hasRole('participant'),
    hasRole,
    roles: user?.roles || [],

    // Auth methods
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,

    // User management
    upgradeToMatcher,
    updateProfile,

    // Token access (for API calls)
    accessToken: session?.access_token
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to use auth context.
 * @returns {Object} Auth context value
 * @throws {Error} If used outside AuthProvider
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
