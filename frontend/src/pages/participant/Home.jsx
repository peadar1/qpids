import { useNavigate, Link } from 'react-router-dom';
import { useParticipantAuth } from '../../context/ParticipantAuthContext';
import { Heart, Search, Key, Calendar, Users, LogOut, Sparkles } from 'lucide-react';

/**
 * Home page for the participant portal.
 * Shows navigation options for browsing events, entering codes, and viewing matches.
 */
export default function ParticipantHome() {
  const { user, isAuthenticated, logout } = useParticipantAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-red-50 to-orange-50">
      {/* Header */}
      <header className="bg-white border-b-2 border-pink-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Heart className="text-pink-500" size={32} fill="currentColor" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-red-500 bg-clip-text text-transparent">
                Qpids Matcher
              </h1>
            </div>

            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-gray-500">Welcome,</p>
                  <p className="font-semibold text-gray-800">{user?.name}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  <LogOut size={18} />
                  Logout
                </button>
              </div>
            ) : (
              <Link
                to="/find/login"
                className="flex items-center gap-2 px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white font-semibold rounded-lg transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="text-orange-400" size={32} />
            <h2 className="text-4xl font-bold text-gray-800">Find Your Match</h2>
            <Sparkles className="text-orange-400" size={32} />
          </div>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Discover matchmaking events near you, register with a private code,
            or view your existing matches.
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {/* Browse Events Card */}
          <div
            onClick={() => navigate('/find/browse')}
            className="bg-white rounded-2xl shadow-lg p-6 border-2 border-pink-100 cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-pink-600 rounded-2xl flex items-center justify-center mb-4">
              <Search className="text-white" size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Browse Events</h3>
            <p className="text-gray-600">
              Discover public matchmaking events happening in your area.
            </p>
          </div>

          {/* Enter Code Card */}
          <div
            onClick={() => navigate('/find/code')}
            className="bg-white rounded-2xl shadow-lg p-6 border-2 border-orange-100 cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center mb-4">
              <Key className="text-white" size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Enter Event Code</h3>
            <p className="text-gray-600">
              Have a private event code? Enter it here to access the event.
            </p>
          </div>

          {/* My Events Card (Auth Required) */}
          <div
            onClick={() => isAuthenticated ? navigate('/find/my-events') : navigate('/find/login')}
            className="bg-white rounded-2xl shadow-lg p-6 border-2 border-purple-100 cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
              <Calendar className="text-white" size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">My Events</h3>
            <p className="text-gray-600">
              View events you've registered for and track your registrations.
            </p>
            {!isAuthenticated && (
              <p className="text-sm text-purple-600 mt-2">Sign in required</p>
            )}
          </div>

          {/* My Matches Card (Auth Required) */}
          <div
            onClick={() => isAuthenticated ? navigate('/find/my-matches') : navigate('/find/login')}
            className="bg-white rounded-2xl shadow-lg p-6 border-2 border-red-100 cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-red-400 to-red-600 rounded-2xl flex items-center justify-center mb-4">
              <Heart className="text-white" size={32} fill="currentColor" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">My Matches</h3>
            <p className="text-gray-600">
              View all your matches across different events.
            </p>
            {!isAuthenticated && (
              <p className="text-sm text-red-600 mt-2">Sign in required</p>
            )}
          </div>
        </div>

        {/* Sign In Prompt (if not authenticated) */}
        {!isAuthenticated && (
          <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-pink-100 text-center max-w-xl mx-auto">
            <Users className="text-pink-500 mx-auto mb-4" size={48} />
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              Create an Account
            </h3>
            <p className="text-gray-600 mb-6">
              Sign in to track your registrations and view your matches across all events.
            </p>
            <Link
              to="/find/login"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              <Heart size={20} fill="currentColor" />
              Sign In or Create Account
            </Link>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-gray-500 border-t border-pink-100 mt-auto">
        <Link to="/" className="hover:text-gray-700 transition-colors">
          <Heart className="inline text-pink-500 mr-1" size={16} fill="currentColor" />
          Qpids Matcher
        </Link>
      </footer>
    </div>
  );
}
