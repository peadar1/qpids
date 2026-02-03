import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { publicEventAPI } from '../../services/api';
import { Heart, Search, MapPin, Calendar, Users, ArrowLeft, Filter } from 'lucide-react';

/**
 * Event browsing page for participants.
 * Displays public events that are open for registration with optional area filtering.
 */
export default function EventBrowse() {
  const [events, setEvents] = useState([]);
  const [areas, setAreas] = useState([]);
  const [selectedArea, setSelectedArea] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchEvents();
    fetchAreas();
  }, [selectedArea]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await publicEventAPI.browse(selectedArea || undefined);
      setEvents(response.data);
      setError('');
    } catch (err) {
      setError('Failed to load events. Please try again.');
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAreas = async () => {
    try {
      const response = await publicEventAPI.getAreas();
      setAreas(response.data);
    } catch (err) {
      console.error('Error fetching areas:', err);
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
                  Browse Events
                </h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search/Filter Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border-2 border-pink-100">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex items-center gap-2 text-gray-600">
              <Filter size={20} />
              <span className="font-semibold">Filter by area:</span>
            </div>
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="flex-1 max-w-xs px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-pink-400 focus:ring-4 focus:ring-pink-100 outline-none transition-all"
            >
              <option value="">All Areas</option>
              {areas.map((area) => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
            {selectedArea && (
              <button
                onClick={() => setSelectedArea('')}
                className="text-pink-600 hover:text-pink-700 font-medium"
              >
                Clear filter
              </button>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">Loading events...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-xl mb-6">
            {error}
          </div>
        )}

        {/* Events Grid */}
        {!loading && !error && (
          <>
            {events.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl shadow-lg border-2 border-pink-100">
                <Search className="text-gray-400 mx-auto mb-4" size={48} />
                <h3 className="text-xl font-bold text-gray-800 mb-2">No Events Found</h3>
                <p className="text-gray-600 mb-4">
                  {selectedArea
                    ? `No public events found in ${selectedArea}.`
                    : 'No public events are currently open for registration.'}
                </p>
                <Link
                  to="/find/code"
                  className="text-pink-600 hover:text-pink-700 font-semibold"
                >
                  Have a private event code? Enter it here
                </Link>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => navigate(`/events/${event.id}/register`)}
                    className="bg-white rounded-2xl shadow-lg p-6 border-2 border-pink-100 cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-xl font-bold text-gray-800">{event.name}</h3>
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                        Open
                      </span>
                    </div>

                    {event.description && (
                      <p className="text-gray-600 mb-4 line-clamp-2">{event.description}</p>
                    )}

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar size={18} className="text-pink-500" />
                        <span>{formatDate(event.event_date)}</span>
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin size={18} className="text-pink-500" />
                          <span>{event.location}</span>
                        </div>
                      )}
                      {event.area && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin size={18} className="text-orange-500" />
                          <span className="text-sm">{event.area}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-gray-600">
                        <Users size={18} className="text-purple-500" />
                        <span>{event.participant_count} registered</span>
                      </div>
                    </div>

                    <button className="w-full bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2">
                      <Heart size={20} fill="currentColor" />
                      Register Now
                    </button>
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
