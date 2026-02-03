import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventAPI } from '../services/api';
import { Plus, Calendar, Users, ArrowRight, Sparkles, Heart } from 'lucide-react';
import { getEventStatusColor, formatDate } from '../utils/helpers';
import Header from '../components/organizer/Header';

export default function Events() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setError(''); // Clear any previous errors
      const response = await eventAPI.getAll();
      setEvents(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load events');
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-red-50 to-orange-50">
      <Header activePage="events" />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-4xl font-bold text-gray-800 mb-2">My Events</h2>
            <p className="text-gray-600">Create and manage your cupid matching events</p>
          </div>
          
          <button
            onClick={() => navigate('/organizer/events/create')}
            className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all"
          >
            <Plus size={20} />
            Create Event
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading events...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-xl">
            {error}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && events.length === 0 && (
          <div className="bg-white rounded-3xl shadow-xl p-12 text-center border-2 border-pink-100">
            <div className="bg-gradient-to-br from-pink-100 to-red-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="text-pink-600" size={48} />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-3">No events yet</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Get started by creating your first cupid matching event. It only takes a few minutes!
            </p>
            <button
              onClick={() => navigate('/organizer/events/create')}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              <Sparkles size={20} />
              Create Your First Event
            </button>
          </div>
        )}

        {/* Events Grid */}
        {!loading && !error && events.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <div
                key={event.id}
                onClick={() => navigate(`/organizer/events/${event.id}`)}
                className="bg-white rounded-2xl shadow-lg hover:shadow-2xl p-6 border-2 border-pink-100 cursor-pointer transition-all hover:scale-[1.02] group"
              >
                {/* Status Badge */}
                <div className="flex items-center justify-between mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border-2 ${getEventStatusColor(event.status)}`}>
                    {event.status.replace('_', ' ').toUpperCase()}
                  </span>
                  <ArrowRight className="text-pink-500 opacity-0 group-hover:opacity-100 transition-opacity" size={20} />
                </div>

                {/* Event Name */}
                <h3 className="text-xl font-bold text-gray-800 mb-3 line-clamp-2">
                  {event.name}
                </h3>

                {/* Event Date */}
                <div className="flex items-center gap-2 text-gray-600 mb-4">
                  <Calendar size={18} className="text-pink-500" />
                  <span className="text-sm font-medium">{formatDate(event.event_date)}</span>
                </div>

                {/* Footer */}
                <div className="pt-4 border-t-2 border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <Users size={16} />
                    <span>{event.participant_count || 0} participants</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <Heart size={16} fill="currentColor" />
                    <span>{event.match_count || 0} matches</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}