import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useParticipantAuth } from '../../context/ParticipantAuthContext';
import { publicEventAPI } from '../../services/api';
import { Heart, ArrowLeft, User, Mail, Phone, MapPin, Calendar, Star, MessageCircle } from 'lucide-react';

/**
 * My Matches page for participants.
 * Displays all matches across all events the participant has registered for.
 */
export default function MyMatches() {
  const { isAuthenticated, loading: authLoading } = useParticipantAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/find/login');
      return;
    }

    if (isAuthenticated) {
      fetchMatches();
    }
  }, [isAuthenticated, authLoading]);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const response = await publicEventAPI.getMyMatches();
      setMatches(response.data);
      setError('');
    } catch (err) {
      setError('Failed to load matches. Please try again.');
      console.error('Error fetching matches:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
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
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-red-50 to-orange-50">
      {/* Header */}
      <header className="bg-white border-b-2 border-pink-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/find')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={24} className="text-gray-600" />
              </button>
              <div className="flex items-center gap-3">
                <Heart className="text-pink-500" size={32} fill="currentColor" />
                <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-red-500 bg-clip-text text-transparent">
                  My Matches
                </h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">Loading your matches...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-xl mb-6">
            {error}
          </div>
        )}

        {/* Matches List */}
        {!loading && !error && (
          <>
            {matches.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl shadow-lg border-2 border-pink-100">
                <Heart className="text-gray-400 mx-auto mb-4" size={48} />
                <h3 className="text-xl font-bold text-gray-800 mb-2">No Matches Yet</h3>
                <p className="text-gray-600 mb-4">
                  You don't have any matches yet. Register for events to get matched!
                </p>
                <Link
                  to="/find/browse"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  Browse Events
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-gray-600">
                  You have <span className="font-semibold text-pink-600">{matches.length}</span> match{matches.length !== 1 ? 'es' : ''} across all events.
                </p>

                {matches.map((match) => (
                  <div
                    key={match.id}
                    className="bg-white rounded-2xl shadow-lg p-6 border-2 border-pink-100"
                  >
                    <div className="flex flex-col md:flex-row md:items-start gap-6">
                      {/* Match Avatar */}
                      <div className="flex-shrink-0">
                        <div className="w-20 h-20 bg-gradient-to-br from-pink-400 to-red-500 rounded-full flex items-center justify-center">
                          <User className="text-white" size={40} />
                        </div>
                      </div>

                      {/* Match Details */}
                      <div className="flex-1">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
                          <h3 className="text-2xl font-bold text-gray-800">{match.match_name}</h3>
                          <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(match.status)}`}>
                            {match.status.charAt(0).toUpperCase() + match.status.slice(1)}
                          </span>
                        </div>

                        {/* Contact Info */}
                        <div className="grid md:grid-cols-2 gap-3 mb-4">
                          {match.match_email && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <Mail size={18} className="text-pink-500" />
                              <a href={`mailto:${match.match_email}`} className="hover:text-pink-600 transition-colors">
                                {match.match_email}
                              </a>
                            </div>
                          )}
                          {match.match_phone && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <Phone size={18} className="text-pink-500" />
                              <a href={`tel:${match.match_phone}`} className="hover:text-pink-600 transition-colors">
                                {match.match_phone}
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Event & Venue Info */}
                        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar size={18} className="text-purple-500" />
                            <span>Event: <span className="font-medium">{match.event_name}</span></span>
                          </div>
                          {match.venue_name && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <MapPin size={18} className="text-orange-500" />
                              <span>Venue: <span className="font-medium">{match.venue_name}</span></span>
                              {match.venue_address && (
                                <span className="text-sm text-gray-500">({match.venue_address})</span>
                              )}
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-gray-600">
                            <Star size={18} className="text-yellow-500" />
                            <span>Compatibility: <span className="font-medium">{match.compatibility_score}%</span></span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-500 text-sm">
                            <span>Matched on {formatDate(match.matched_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {match.match_email && (
                      <div className="mt-4 pt-4 border-t border-gray-100 flex gap-3">
                        <a
                          href={`mailto:${match.match_email}?subject=Hello from Qpids Matcher!`}
                          className="flex items-center gap-2 px-4 py-2 bg-pink-100 hover:bg-pink-200 text-pink-700 font-medium rounded-lg transition-colors"
                        >
                          <MessageCircle size={18} />
                          Send Email
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
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
