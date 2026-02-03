import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventAPI, participantAPI } from '../services/api';
import {
  ArrowLeft,
  Users,
  Mail,
  Search,
  Filter,
  Download,
  Trash2,
  Eye,
  X,
  AlertCircle
} from 'lucide-react';
import { getParticipantStatusColor, calculateAge } from '../utils/helpers';
import Header from '../components/organizer/Header';

export default function Participants() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchEventAndParticipants();
  }, [eventId]);

  const fetchEventAndParticipants = async () => {
    try {
      setError(''); // Clear any previous errors
      const [eventRes, participantsRes] = await Promise.all([
        eventAPI.getById(eventId),
        participantAPI.getAll(eventId)
      ]);
      setEvent(eventRes.data);
      setParticipants(participantsRes.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load participants');
      setLoading(false);
    }
  };

  const handleDelete = async (participantId) => {
    if (window.confirm('Are you sure you want to delete this participant?')) {
      try {
        await participantAPI.delete(eventId, participantId);
        fetchEventAndParticipants();
      } catch (err) {
        setError('Failed to delete participant');
      }
    }
  };

  const handleViewDetails = (participant) => {
    setSelectedParticipant(participant);
    setShowDetailModal(true);
  };


  // Filter participants
  const filteredParticipants = participants.filter(participant => {
    const matchesSearch = participant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         participant.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || participant.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Count by status
  const statusCounts = participants.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {});

  const exportToCSV = () => {
    if (participants.length === 0) return;

    const headers = ['Name', 'Email', 'Phone', 'Age', 'Gender', 'Interested In', 'Status', 'Registered At'];
    const rows = participants.map(p => [
      p.name,
      p.email,
      p.phone || '',
      p.age || '',
      p.gender || '',
      p.interested_in || '',
      p.status,
      new Date(p.created_at).toLocaleDateString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event?.name.replace(/\s+/g, '_')}_participants.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-red-50 to-orange-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading participants...</p>
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
            <h2 className="text-4xl font-bold text-gray-800 mb-2">Participants</h2>
            <p className="text-gray-600">{event?.name}</p>
          </div>

          <button
            onClick={exportToCSV}
            disabled={participants.length === 0}
            className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={20} />
            Export CSV
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-xl mb-6 flex items-center gap-3">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total</p>
                <p className="text-3xl font-bold text-gray-800">{participants.length}</p>
              </div>
              <Users className="text-blue-500" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-green-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Registered</p>
                <p className="text-3xl font-bold text-gray-800">{statusCounts.registered || 0}</p>
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Matched</p>
                <p className="text-3xl font-bold text-gray-800">{statusCounts.matched || 0}</p>
              </div>
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-yellow-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Waitlisted</p>
                <p className="text-3xl font-bold text-gray-800">{statusCounts.waitlisted || 0}</p>
              </div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            </div>
          </div>
        </div>

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
                  placeholder="Search by name or email..."
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
                  <option value="registered">Registered</option>
                  <option value="matched">Matched</option>
                  <option value="waitlisted">Waitlisted</option>
                  <option value="withdrawn">Withdrawn</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Participants Table */}
        {filteredParticipants.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-lg p-12 text-center border-2 border-pink-100">
            <div className="bg-gradient-to-br from-pink-100 to-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="text-pink-600" size={40} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">
              {searchQuery || statusFilter !== 'all' ? 'No participants found' : 'No participants yet'}
            </h3>
            <p className="text-gray-600">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Share the registration link to get participants!'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg border-2 border-pink-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-pink-50 to-red-50 border-b-2 border-pink-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Name</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Email</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Age</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Gender</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Registered</th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredParticipants.map((participant) => (
                    <tr key={participant.id} className="hover:bg-pink-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-gradient-to-br from-pink-400 to-red-400 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold">
                            {participant.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-gray-800">{participant.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Mail size={16} className="text-gray-400" />
                          {participant.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {participant.age || calculateAge(participant.date_of_birth) || 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="capitalize text-gray-700">
                          {participant.gender?.replace('_', ' ') || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border-2 ${getParticipantStatusColor(participant.status)}`}>
                          {participant.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-sm">
                        {new Date(participant.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewDetails(participant)}
                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(participant.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Participant Detail Modal */}
      {showDetailModal && selectedParticipant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-pink-100">
            <div className="sticky top-0 bg-gradient-to-r from-pink-500 to-red-500 p-6 flex items-center justify-between border-b-2 border-pink-200">
              <h3 className="text-2xl font-bold text-white">Participant Details</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              {/* Basic Info */}
              <div>
                <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Users className="text-pink-500" size={20} />
                  Basic Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">Name</p>
                    <p className="font-semibold text-gray-800">{selectedParticipant.name}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">Email</p>
                    <p className="font-semibold text-gray-800">{selectedParticipant.email}</p>
                  </div>
                  {selectedParticipant.phone && (
                    <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-100">
                      <p className="text-sm text-gray-500 mb-1">Phone</p>
                      <p className="font-semibold text-gray-800">{selectedParticipant.phone}</p>
                    </div>
                  )}
                  <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">Age</p>
                    <p className="font-semibold text-gray-800">
                      {selectedParticipant.age || calculateAge(selectedParticipant.date_of_birth) || 'N/A'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">Gender</p>
                    <p className="font-semibold text-gray-800 capitalize">
                      {selectedParticipant.gender?.replace('_', ' ') || 'N/A'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">Interested In</p>
                    <p className="font-semibold text-gray-800 capitalize">
                      {selectedParticipant.interested_in?.replace('_', ' ') || 'N/A'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">Status</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border-2 ${getParticipantStatusColor(selectedParticipant.status)}`}>
                      {selectedParticipant.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">Registered At</p>
                    <p className="font-semibold text-gray-800">
                      {new Date(selectedParticipant.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bio */}
              {selectedParticipant.bio && (
                <div>
                  <h4 className="text-lg font-bold text-gray-800 mb-3">Bio</h4>
                  <div className="bg-pink-50 rounded-xl p-4 border-2 border-pink-100">
                    <p className="text-gray-700">{selectedParticipant.bio}</p>
                  </div>
                </div>
              )}

              {/* Custom Answers */}
              {selectedParticipant.form_answers && Object.keys(selectedParticipant.form_answers).length > 0 && (
                <div>
                  <h4 className="text-lg font-bold text-gray-800 mb-4">Custom Answers</h4>
                  <div className="space-y-3">
                    {Object.entries(selectedParticipant.form_answers).map(([key, value]) => (
                      <div key={key} className="bg-gray-50 rounded-xl p-4 border-2 border-gray-100">
                        <p className="text-sm text-gray-500 mb-1 font-medium capitalize">
                          {key.replace(/_/g, ' ')}
                        </p>
                        <p className="text-gray-800">
                          {Array.isArray(value) ? value.join(', ') : value || 'N/A'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 p-6 border-t-2 border-gray-100 flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-bold py-3 px-6 rounded-xl transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
