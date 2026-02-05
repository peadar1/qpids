import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { participantAuthAPI } from '../services/api';
import {
  supabase,
  signInWithGoogle,
  signOutFromSupabase,
  getSupabaseSession,
  onAuthStateChange
} from '../services/supabase';

const ParticipantAuthContext = createContext(null);

/**
 * Provider for participant authentication state.
 * Supports both email/password and Google OAuth via Supabase Auth.
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 */
export const ParticipantAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMethod, setAuthMethod] = useState(null); // 'email' or 'oauth'
  const initializingRef = useRef(false);

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        // First check localStorage for email/password session
        const storedToken = localStorage.getItem('participant_token');
        const storedUser = localStorage.getItem('participant_user');

        if (storedToken && storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setToken(storedToken);
          setUser(parsedUser);
          setAuthMethod('email');
          setLoading(false);
          return;
        }

        // Check for Supabase Auth session (OAuth)
        const session = await getSupabaseSession();
        if (session?.access_token) {
          // Fetch or create participant user from our backend
          initializingRef.current = true;
          try {
            const response = await participantAuthAPI.getMe(session.access_token);
            setUser(response.data);
            setToken(session.access_token);
            setAuthMethod('oauth');
            localStorage.setItem('participant_token', session.access_token);
            localStorage.setItem('participant_user', JSON.stringify(response.data));
          } catch (error) {
            console.error('Failed to fetch participant user:', error);
            // Session exists but backend doesn't recognize - sign out
            await signOutFromSupabase();
          } finally {
            initializingRef.current = false;
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        // Clear potentially corrupted data
        localStorage.removeItem('participant_token');
        localStorage.removeItem('participant_user');
      }
      setLoading(false);
    };

    initAuth();

    // Listen for Supabase auth state changes
    const { data: { subscription } } = onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Skip if initAuth() is already handling this session
        if (initializingRef.current) return;
        try {
          const response = await participantAuthAPI.getMe(session.access_token);
          setUser(response.data);
          setToken(session.access_token);
          setAuthMethod('oauth');
          localStorage.setItem('participant_token', session.access_token);
          localStorage.setItem('participant_user', JSON.stringify(response.data));
        } catch (error) {
          console.error('Failed to fetch participant user after sign in:', error);
        }
      } else if (event === 'TOKEN_REFRESHED' && session) {
        // Update localStorage when token is refreshed
        setToken(session.access_token);
        localStorage.setItem('participant_token', session.access_token);
      } else if (event === 'SIGNED_OUT') {
        if (authMethod === 'oauth') {
          setUser(null);
          setToken(null);
          setAuthMethod(null);
          localStorage.removeItem('participant_token');
        }
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  /**
   * Login with email and password.
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} Result with success boolean and optional error
   */
  const login = async (email, password) => {
    try {
      const response = await participantAuthAPI.login({ email, password });
      const { access_token, participant_user } = response.data;

      setToken(access_token);
      setUser(participant_user);
      setAuthMethod('email');

      localStorage.setItem('participant_token', access_token);
      localStorage.setItem('participant_user', JSON.stringify(participant_user));

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Login failed'
      };
    }
  };

  /**
   * Sign up with email and password.
   * @param {string} name - User name
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} Result with success boolean and optional error
   */
  const signup = async (name, email, password) => {
    try {
      const response = await participantAuthAPI.signup({ name, email, password });
      const { access_token, participant_user } = response.data;

      setToken(access_token);
      setUser(participant_user);
      setAuthMethod('email');

      localStorage.setItem('participant_token', access_token);
      localStorage.setItem('participant_user', JSON.stringify(participant_user));

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Signup failed'
      };
    }
  };

  /**
   * Sign in with Google OAuth.
   * Redirects to Google and then to /auth/callback.
   * @returns {Promise<Object>} Result with success boolean and optional error
   */
  const loginWithGoogle = async () => {
    try {
      await signInWithGoogle();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Google sign-in failed'
      };
    }
  };

  /**
   * Logout from both email/password and OAuth sessions.
   */
  const logout = async () => {
    // Clear email/password session
    localStorage.removeItem('participant_token');
    localStorage.removeItem('participant_user');

    // Sign out from Supabase if using OAuth
    if (authMethod === 'oauth') {
      try {
        await signOutFromSupabase();
      } catch (error) {
        console.error('Supabase sign out error:', error);
      }
    }

    setUser(null);
    setToken(null);
    setAuthMethod(null);
  };

  /**
   * Update the current user's profile.
   * @param {Object} updates - Profile fields to update
   * @returns {Promise<Object>} Result with success boolean and optional error
   */
  const updateProfile = async (updates) => {
    try {
      const response = await participantAuthAPI.updateMe(updates, token);
      setUser(response.data);

      if (authMethod === 'email') {
        localStorage.setItem('participant_user', JSON.stringify(response.data));
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Profile update failed'
      };
    }
  };

  const value = {
    user,
    token,
    loading,
    authMethod,
    login,
    signup,
    loginWithGoogle,
    logout,
    updateProfile,
    isAuthenticated: !!token,
  };

  return (
    <ParticipantAuthContext.Provider value={value}>
      {children}
    </ParticipantAuthContext.Provider>
  );
};

/**
 * Custom hook to use participant auth context.
 * @returns {Object} Auth context value
 * @throws {Error} If used outside ParticipantAuthProvider
 */
export const useParticipantAuth = () => {
  const context = useContext(ParticipantAuthContext);
  if (!context) {
    throw new Error('useParticipantAuth must be used within ParticipantAuthProvider');
  }
  return context;
};
