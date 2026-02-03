import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventAPI, participantAPI, venueAPI, matchAPI } from '../services/api';
import {
  Heart,
  ArrowLeft,
  Plus,
  Users,
  MapPin,
  Trash2,
  AlertCircle,
  Save,
  X,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';
import { getMatchStatusColor } from '../utils/helpers';
import Header from '../components/organizer/Header';

export default function Matches() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [venues, setVenues] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedMatch, setExpandedMatch] = useState(null);

  const [formData, setFormData] = useState({
    participant1_id: '',
    participant2_id: '',
    venue_id: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const fetchData = async () => {
    try {
      setError(''); // Clear any previous errors

      const [eventRes, participantsRes, venuesRes, matchesRes] = await Promise.all([
        eventAPI.getById(eventId),
        participantAPI.getAll(eventId),
        venueAPI.getAll(eventId),
        matchAPI.getAll(eventId).catch(() => ({ data: [] }))
      ]);

      setEvent(eventRes.data);
      setParticipants(participantsRes.data);
      setVenues(venuesRes.data);
      setMatches(matchesRes.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load data');
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleCreateMatch = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.participant1_id === formData.participant2_id) {
      setError('Cannot match a participant with themselves');
      return;
    }

    if (!formData.participant1_id || !formData.participant2_id) {
      setError('Please select two participants');
      return;
    }

    try {
      await matchAPI.create(eventId, {
        participant1_id: formData.participant1_id,
        participant2_id: formData.participant2_id,
        compatibility_score: 75, // Default score for manual matches
        venue_id: formData.venue_id || null,
        notes: formData.notes || null
      });

      fetchData();
      setShowCreateForm(false);
      setFormData({
        participant1_id: '',
        participant2_id: '',
        venue_id: '',
        notes: ''
      });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create match');
    }
  };

  const handleDeleteMatch = async (matchId) => {
    if (window.confirm('Are you sure you want to delete this match?')) {
      try {
        await matchAPI.delete(eventId, matchId);
        fetchData();
      } catch (err) {
        setError('Failed to delete match');
      }
    }
  };

  const handleAssignVenue = async (matchId, venueId) => {
    try {
      await matchAPI.update(eventId, matchId, { venue_id: venueId || null });
      fetchData();
    } catch (err) {
      setError('Failed to assign venue');
    }
  };

  const getParticipantById = (id) => {
    return participants.find(p => p.id === id);
  };

  const getVenueById = (id) => {
    return venues.find(v => v.id === id);
  };


  // Filter matches
  const filteredMatches = matches.filter(match => {
    const p1 = getParticipantById(match.participant1_id);
    const p2 = getParticipantById(match.participant2_id);

    const matchesSearch =
      p1?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p2?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p1?.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p2?.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || match.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Get available participants (not already matched)
  const matchedParticipantIds = new Set();
  matches.forEach(match => {
    matchedParticipantIds.add(match.participant1_id);
    matchedParticipantIds.add(match.participant2_id);
  });
  const availableParticipants = participants.filter(p => !matchedParticipantIds.has(p.id));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-red-50 to-orange-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading matches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-red-50 to-orange-50">
      <Header activePage="events" />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Button & Header */}
        <button
          onClick={() => navigate(`/organizer/events/${eventId}`)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 font-medium transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Event
        </button>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-4xl font-bold text-gray-800 mb-2">Matches</h2>
            <p className="text-gray-600">{event?.name}</p>
          </div>

          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            disabled={availableParticipants.length < 2}
            className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={20} />
            Create Match
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-xl mb-6 flex items-center gap-3">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-pink-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Matches</p>
                <p className="text-3xl font-bold text-gray-800">{matches.length}</p>
              </div>
              <Heart className="text-pink-500" size={32} fill="currentColor" />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Available</p>
                <p className="text-3xl font-bold text-gray-800">{availableParticipants.length}</p>
              </div>
              <Users className="text-blue-500" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-green-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">With Venue</p>
                <p className="text-3xl font-bold text-gray-800">
                  {matches.filter(m => m.venue_id).length}
                </p>
              </div>
              <MapPin className="text-green-500" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Confirmed</p>
                <p className="text-3xl font-bold text-gray-800">
                  {matches.filter(m => m.status === 'confirmed').length}
                </p>
              </div>
              <Sparkles className="text-purple-500" size={32} />
            </div>
          </div>
        </div>

        {/* Create Match Form */}
        {showCreateForm && (
          <div className="bg-white rounded-3xl shadow-xl p-8 mb-8 border-2 border-pink-100">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Create New Match</h3>

            <form onSubmit={handleCreateMatch} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Participant 1 */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    First Participant *
                  </label>
                  <select
                    name="participant1_id"
                    value={formData.participant1_id}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-400 focus:ring-4 focus:ring-pink-100 outline-none transition-all"
                    required
                  >
                    <option value="">Select participant...</option>
                    {availableParticipants.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.age}, {p.gender})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Participant 2 */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Second Participant *
                  </label>
                  <select
                    name="participant2_id"
                    value={formData.participant2_id}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-400 focus:ring-4 focus:ring-pink-100 outline-none transition-all"
                    required
                  >
                    <option value="">Select participant...</option>
                    {availableParticipants
                      .filter(p => p.id !== formData.participant1_id)
                      .map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.age}, {p.gender})
                        </option>
                      ))}
                  </select>
                </div>

                {/* Venue (Optional) */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Assign Venue (Optional)
                  </label>
                  <select
                    name="venue_id"
                    value={formData.venue_id}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-400 focus:ring-4 focus:ring-pink-100 outline-none transition-all"
                  >
                    <option value="">No venue assigned</option>
                    {venues.filter(v => v.is_active && v.available_slots > 0).map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.available_slots}/{v.total_capacity} available)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-400 focus:ring-4 focus:ring-pink-100 outline-none transition-all resize-none"
                    placeholder="Any notes about this match..."
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  <Save size={20} />
                  Create Match
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setFormData({
                      participant1_id: '',
                      participant2_id: '',
                      venue_id: '',
                      notes: ''
                    });
                  }}
                  className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-xl transition-all"
                >
                  <X size={20} />
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border-2 border-pink-100">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by participant name or email..."
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-400 focus:ring-4 focus:ring-pink-100 outline-none transition-all"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="md:w-64">
              <div className="relative">
                <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-400 focus:ring-4 focus:ring-pink-100 outline-none transition-all appearance-none bg-white"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="notified">Notified</option>
                  <option value="confirmed">Confirmed</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Matches List */}
        {filteredMatches.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-lg p-12 text-center border-2 border-pink-100">
            <div className="bg-gradient-to-br from-pink-100 to-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="text-pink-600" size={40} fill="currentColor" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">
              {searchQuery || statusFilter !== 'all' ? 'No matches found' : 'No matches yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : availableParticipants.length < 2
                ? 'You need at least 2 participants to create matches'
                : 'Create your first match to get started!'}
            </p>
            {availableParticipants.length >= 2 && !searchQuery && statusFilter === 'all' && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                <Plus size={20} />
                Create Your First Match
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMatches.map((match) => {
              const p1 = getParticipantById(match.participant1_id);
              const p2 = getParticipantById(match.participant2_id);
              const venue = match.venue_id ? getVenueById(match.venue_id) : null;
              const isExpanded = expandedMatch === match.id;

              return (
                <div key={match.id} className="bg-white rounded-2xl shadow-lg border-2 border-pink-100 overflow-hidden">
                  {/* Match Header */}
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4 flex-1">
                        {/* Participant 1 */}
                        <div className="flex items-center gap-3">
                          <div className="bg-gradient-to-br from-pink-400 to-red-400 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg">
                            {p1?.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-800">{p1?.name}</p>
                            <p className="text-sm text-gray-500">{p1?.age}, {p1?.gender}</p>
                          </div>
                        </div>

                        {/* Heart Icon */}
                        <Heart className="text-pink-500" size={24} fill="currentColor" />

                        {/* Participant 2 */}
                        <div className="flex items-center gap-3">
                          <div className="bg-gradient-to-br from-purple-400 to-indigo-400 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg">
                            {p2?.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-800">{p2?.name}</p>
                            <p className="text-sm text-gray-500">{p2?.age}, {p2?.gender}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border-2 ${getMatchStatusColor(match.status)}`}>
                          {match.status.toUpperCase()}
                        </span>
                        <button
                          onClick={() => setExpandedMatch(isExpanded ? null : match.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </button>
                      </div>
                    </div>

                    {/* Venue & Score */}
                    <div className="flex items-center gap-4 flex-wrap">
                      {venue ? (
                        <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-lg border-2 border-green-100">
                          <MapPin size={16} className="text-green-600" />
                          <span className="text-sm font-semibold text-green-700">{venue.name}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border-2 border-gray-200">
                          <MapPin size={16} className="text-gray-400" />
                          <span className="text-sm text-gray-600">No venue assigned</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 bg-purple-50 px-3 py-2 rounded-lg border-2 border-purple-100">
                        <Sparkles size={16} className="text-purple-600" />
                        <span className="text-sm font-semibold text-purple-700">
                          {match.compatibility_score}% Match
                        </span>
                      </div>

                      <span className="text-xs text-gray-500">
                        Created {new Date(match.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t-2 border-gray-100 p-6 bg-gray-50">
                      <div className="space-y-4">
                        {/* Assign Venue */}
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">
                            Assign Venue
                          </label>
                          <div className="flex gap-3">
                            <select
                              value={match.venue_id || ''}
                              onChange={(e) => handleAssignVenue(match.id, e.target.value)}
                              className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-pink-400 focus:ring-4 focus:ring-pink-100 outline-none transition-all"
                            >
                              <option value="">No venue assigned</option>
                              {venues.filter(v => v.is_active && (v.available_slots > 0 || v.id === match.venue_id)).map(v => (
                                <option key={v.id} value={v.id}>
                                  {v.name} ({v.available_slots}/{v.total_capacity} available)
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Notes */}
                        {match.notes && (
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                              Notes
                            </label>
                            <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
                              <p className="text-gray-700">{match.notes}</p>
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 pt-4">
                          <button
                            onClick={() => handleDeleteMatch(match.id)}
                            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                            Delete Match
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
