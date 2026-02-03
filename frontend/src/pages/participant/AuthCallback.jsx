import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { supabase } from '../../services/supabase';

/**
 * OAuth callback handler page.
 * Processes the OAuth redirect from Supabase Auth (Google, etc.)
 * and redirects the user to the participant portal.
 */
export default function AuthCallback() {
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session from the URL hash (Supabase stores tokens in hash)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session error:', sessionError);
          setError('Authentication failed. Please try again.');
          setTimeout(() => navigate('/find/login'), 3000);
          return;
        }

        if (session) {
          // Session exists - redirect to participant home
          // The ParticipantAuthContext will handle creating/fetching the user
          navigate('/find');
        } else {
          // No session - check URL for error
          const params = new URLSearchParams(window.location.search);
          const errorParam = params.get('error');
          const errorDescription = params.get('error_description');

          if (errorParam) {
            setError(errorDescription || 'Authentication was cancelled or failed.');
          } else {
            // Try to exchange the code if present
            const code = params.get('code');
            if (code) {
              // Supabase should handle this automatically via the SDK
              // If we get here without a session, something went wrong
              setError('Failed to complete authentication. Please try again.');
            } else {
              setError('No authentication data received.');
            }
          }

          setTimeout(() => navigate('/find/login'), 3000);
        }
      } catch (err) {
        console.error('Callback error:', err);
        setError('Something went wrong. Please try again.');
        setTimeout(() => navigate('/find/login'), 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="text-center">
        {error ? (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="text-red-500" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Authentication Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <p className="text-sm text-gray-500">Redirecting to login...</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Completing Sign In</h2>
            <p className="text-gray-600">Please wait while we complete your sign in...</p>
          </>
        )}
      </div>
    </div>
  );
}
