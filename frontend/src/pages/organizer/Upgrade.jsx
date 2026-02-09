import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Heart, Sparkles, Crown, CheckCircle, ArrowRight } from 'lucide-react';

/**
 * Upgrade page for users to become event organizers/matchers.
 * Allows authenticated users to add the 'matcher' role to their account.
 */
export default function Upgrade() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const { isAuthenticated, isMatcher, upgradeToMatcher, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect if already a matcher
  useEffect(() => {
    if (!authLoading && isAuthenticated && isMatcher) {
      navigate('/organizer/dashboard', { replace: true });
    }
  }, [isAuthenticated, isMatcher, authLoading, navigate]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/organizer/login', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleUpgrade = async () => {
    setError('');
    setLoading(true);

    try {
      await upgradeToMatcher();
      setSuccess(true);
      // Redirect after a short delay to show success message
      setTimeout(() => {
        navigate('/organizer/dashboard');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to upgrade account');
    }

    setLoading(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-red-50 to-orange-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-red-50 to-orange-50 flex items-center justify-center p-4">
      {/* Animated background hearts */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-10">
        {[...Array(20)].map((_, i) => (
          <Heart
            key={i}
            className="absolute text-pink-400 animate-float"
            size={Math.random() * 40 + 20}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${Math.random() * 10 + 5}s`,
            }}
          />
        ))}
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo/Header */}
        <div className="text-center mb-8 animate-fadeIn">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Crown className="text-yellow-500" size={48} />
            <Sparkles className="text-orange-400" size={32} />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 via-red-500 to-orange-500 bg-clip-text text-transparent mb-2">
            Become an Organizer
          </h1>
          <p className="text-gray-600 text-lg">Create and manage matchmaking events</p>
        </div>

        {/* Upgrade Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 border-2 border-pink-100 animate-slideUp">
          {success ? (
            <div className="text-center">
              <CheckCircle className="text-green-500 mx-auto mb-4" size={64} />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome, Organizer!</h2>
              <p className="text-gray-600 mb-4">Your account has been upgraded successfully.</p>
              <p className="text-gray-500 text-sm">Redirecting to dashboard...</p>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <p className="text-gray-600">
                  Hi <span className="font-semibold">{user?.name || user?.email}</span>!
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  Click below to unlock organizer features.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 animate-shake">
                  {error}
                </div>
              )}

              {/* Features List */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <h3 className="font-semibold text-gray-700 mb-3">As an organizer you can:</h3>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-gray-600">
                    <CheckCircle size={16} className="text-green-500" />
                    Create matchmaking events
                  </li>
                  <li className="flex items-center gap-2 text-gray-600">
                    <CheckCircle size={16} className="text-green-500" />
                    Manage participant registrations
                  </li>
                  <li className="flex items-center gap-2 text-gray-600">
                    <CheckCircle size={16} className="text-green-500" />
                    Create matches between participants
                  </li>
                  <li className="flex items-center gap-2 text-gray-600">
                    <CheckCircle size={16} className="text-green-500" />
                    Customize registration forms
                  </li>
                </ul>
              </div>

              {/* Upgrade Button */}
              <button
                onClick={handleUpgrade}
                disabled={loading}
                className="w-full bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Upgrading...
                  </>
                ) : (
                  <>
                    <Crown size={20} />
                    Become an Organizer
                    <ArrowRight size={20} />
                  </>
                )}
              </button>

              {/* Skip Link */}
              <div className="mt-6 text-center">
                <Link
                  to="/find"
                  className="text-gray-500 hover:text-gray-700 text-sm transition-colors"
                >
                  Skip for now - continue as participant
                </Link>
              </div>
            </>
          )}

          {/* Back to Landing */}
          <div className="mt-4 text-center">
            <Link
              to="/"
              className="text-gray-500 hover:text-gray-700 text-sm transition-colors"
            >
              Back to home
            </Link>
          </div>
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(10deg); }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }

        .animate-float {
          animation: float 8s ease-in-out infinite;
        }

        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.6s ease-out;
        }

        .animate-shake {
          animation: shake 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}
