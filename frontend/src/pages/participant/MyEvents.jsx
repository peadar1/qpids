import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useParticipantAuth } from '../../context/ParticipantAuthContext';
import { publicEventAPI } from '../../services/api';
import { Heart, ArrowLeft, Calendar, Users, CheckCircle, Clock, XCircle, Search } from 'lucide-react';

/**
 * My Events page for participants.
 * Displays all events the participant has registered for.
 */
export default function MyEvents() {
  const { isAuthenticated, loading: authLoading } = useParticipantAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/find/login');
      return;
    }

    if (isAuthenticated) {
      fetchEvents();
    }
  }, [isAuthenticated, authLoading]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await publicEventAPI.getMyEvents();
      setEvents(response.data);
      setError('');
    } catch (err) {
      setError('Failed to load events. Please try again.');
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getEventStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'registration_open':
        return <Clock className="text-yellow-500" size={20} />;
      case 'matching_in_progress':
        return <Users className="text-purple-500" size={20} />;
      case 'cancelled':
        return <XCircle className="text-red-500" size={20} />;
      default:
        return <Clock className="text-gray-500" size={20} />;
    }
  };

  const getEventStatusText = (status) => {
    switch (status) {
      case 'setup':
        return 'Setting Up';
      case 'registration_open':
        return 'Registration Open';
      case 'matching_in_progress':
        return 'Matching in Progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const getRegistrationStatusColor = (status) => {
    switch (status) {
      case 'registered':
        return 'bg-blue-100 text-blue-700';
      case 'matched':
        return 'bg-green-100 text-green-700';
      case 'withdrawn':
        return 'bg-gray-100 text-gray-700';
      case 'waitlisted':
        return 'bg-yellow-100 text-yellow-700';
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
                  My Events
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
            <p className="text-gray-600 text-lg">Loading your events...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-xl mb-6">
            {error}
          </div>
        )}

        {/* Events List */}
        {!loading && !error && (
          <>
            {events.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl shadow-lg border-2 border-pink-100">
                <Calendar className="text-gray-400 mx-auto mb-4" size={48} />
                <h3 className="text-xl font-bold text-gray-800 mb-2">No Events Yet</h3>
                <p className="text-gray-600 mb-4">
                  You haven't registered for any events yet.
                </p>
                <Link
                  to="/find/browse"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  <Search size={20} />
                  Browse Events
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-gray-600">
                  You are registered for <span className="font-semibold text-pink-600">{events.length}</span> event{events.length !== 1 ? 's' : ''}.
                </p>

                {events.map((event) => (
                  <div
                    key={event.id}
                    className="bg-white rounded-2xl shadow-lg p-6 border-2 border-purple-100"
                  >
                    <div className="flex flex-col md:flex-row md:items-start gap-6">
                      {/* Event Icon */}
                      <div className="flex-shrink-0">
                        <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center">
                          <Calendar className="text-white" size={32} />
                        </div>
                      </div>

                      {/* Event Details */}
                      <div className="flex-1">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                          <h3 className="text-xl font-bold text-gray-800">{event.event_name}</h3>
                          <span className={`px-3 py-1 text-sm font-medium rounded-full ${getRegistrationStatusColor(event.registration_status)}`}>
                            {event.registration_status.charAt(0).toUpperCase() + event.registration_status.slice(1)}
                          </span>
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar size={18} className="text-purple-500" />
                            <span>{formatDate(event.event_date)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            {getEventStatusIcon(event.event_status)}
                            <span>{getEventStatusText(event.event_status)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-500 text-sm">
                            <span>Registered on {formatDate(event.registered_at)}</span>
                          </div>
                        </div>

                        {/* Match Count */}
                        {event.match_count > 0 && (
                          <div className="bg-pink-50 rounded-xl p-4 flex items-center gap-3">
                            <Heart className="text-pink-500" size={24} fill="currentColor" />
                            <div>
                              <p className="font-semibold text-pink-700">
                                {event.match_count} Match{event.match_count !== 1 ? 'es' : ''}!
                              </p>
                              <p className="text-sm text-pink-600">
                                <Link
                                  to="/find/my-matches"
                                  className="hover:underline"
                                >
                                  View your matches
                                </Link>
                              </p>
                            </div>
                          </div>
                        )}

                        {event.event_status === 'matching_in_progress' && event.match_count === 0 && (
                          <div className="bg-purple-50 rounded-xl p-4 flex items-center gap-3">
                            <Users className="text-purple-500" size={24} />
                            <div>
                              <p className="font-semibold text-purple-700">Matching in Progress</p>
                              <p className="text-sm text-purple-600">
                                The organizer is currently creating matches. Check back soon!
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
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
