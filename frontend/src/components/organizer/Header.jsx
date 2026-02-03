import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Heart, LogOut } from 'lucide-react';

/**
 * Header component for the organizer portal.
 * Displays navigation and user info for authenticated matchers.
 * @param {Object} props
 * @param {string} props.activePage - The currently active page ('dashboard' or 'events')
 */
export default function Header({ activePage }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navLinkClass = (page) =>
    page === activePage
      ? 'text-pink-600 font-semibold border-b-2 border-pink-600'
      : 'text-gray-600 hover:text-gray-900 font-medium transition-colors';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="bg-white border-b-2 border-pink-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => navigate('/organizer/dashboard')}
            >
              <Heart className="text-pink-500" size={32} fill="currentColor" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-red-500 bg-clip-text text-transparent">
                Qpids Matcher
              </h1>
            </div>

            <nav className="flex gap-4">
              <button
                onClick={() => navigate('/organizer/dashboard')}
                className={navLinkClass('dashboard')}
              >
                Dashboard
              </button>
              <button
                onClick={() => navigate('/organizer/events')}
                className={navLinkClass('events')}
              >
                Events
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-500">Welcome back,</p>
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
        </div>
      </div>
    </header>
  );
}
