import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventAPI, participantAPI, venueAPI } from '../services/api';
import {
  Heart,
  ArrowLeft,
  Calendar,
  Edit2,
  Users,
  FileText,
  MapPin,
  Trash2,
  Save,
  X,
  Link,
  Copy,
  Check,
  ExternalLink
} from 'lucide-react';
import { getEventStatusColor, formatDate } from '../utils/helpers';
import Header from '../components/organizer/Header';

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [venueCount, setVenueCount] = useState(0);

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    event_date: "",
    status: "setup",
  });

  // Generate registration link
  const registrationLink = `${window.location.origin}/events/${id}/register`;

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const fetchEvent = async () => {
    try {
      const [eventResponse, participantsResponse, venuesResponse] = await Promise.all([
        eventAPI.getById(id),
        participantAPI.getAll(id).catch(() => ({ data: [] })),
        venueAPI.getAll(id).catch(() => ({ data: [] }))
      ]);
      setEvent(eventResponse.data);
      setParticipantCount(participantsResponse.data.length);
      setFormData({
        name: eventResponse.data.name,
        description: eventResponse.data.description || '',
        event_date: eventResponse.data.event_date,
        status: eventResponse.data.status,
      });
      setVenueCount(venuesResponse.data.length);
      setLoading(false);
    } catch (err) {
      setError("Failed to load event");
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleUpdate = async () => {
    try {
      await eventAPI.update(id, formData);
      setEditing(false);
      fetchEvent();
    } catch (err) {
      setError("Failed to update event");
    }
  };

  const handleDelete = async () => {
    if (
      window.confirm(
        "Are you sure you want to delete this event? This cannot be undone.",
      )
    ) {
      try {
        await eventAPI.delete(id);
        navigate("/organizer/events");
      } catch (err) {
        setError("Failed to delete event");
      }
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(registrationLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = registrationLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-red-50 to-orange-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading event...</p>
        </div>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-red-50 to-orange-50">
        <div className="text-center">
          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-xl mb-4">
            {error}
          </div>
          <button
            onClick={() => navigate("/organizer/events")}
            className="text-pink-600 hover:text-pink-700 font-semibold"
          >
            ← Back to Events
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-red-50 to-orange-50">
      <Header activePage="events" />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Button */}
        <button
          onClick={() => navigate("/organizer/events")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 font-medium transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Events
        </button>

        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-xl mb-6">
            {error}
          </div>
        )}

        {/* Event Header Card */}
        <div className="bg-white rounded-3xl shadow-xl p-8 mb-6 border-2 border-pink-100">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {editing ? (
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="text-4xl font-bold text-gray-800 mb-4 w-full border-2 border-pink-200 rounded-xl px-4 py-2 focus:border-pink-400 focus:ring-4 focus:ring-pink-100 outline-none"
                />
              ) : (
                <h2 className="text-4xl font-bold text-gray-800 mb-4">
                  {event?.name}
                </h2>
              )}

              <div className="flex items-center gap-4 flex-wrap">
                {editing ? (
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="px-4 py-2 rounded-full text-sm font-semibold border-2 focus:outline-none focus:ring-4 focus:ring-pink-100"
                  >
                    <option value="setup">Setup</option>
                    <option value="registration_open">Registration Open</option>
                    <option value="matching_in_progress">
                      Matching In Progress
                    </option>
                    <option value="completed">Completed</option>
                  </select>
                ) : (
                  <span
                    className={`px-4 py-2 rounded-full text-sm font-semibold border-2 ${getEventStatusColor(event?.status)}`}
                  >
                    {event?.status.replace("_", " ").toUpperCase()}
                  </span>
                )}

                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar size={18} className="text-pink-500" />
                  {editing ? (
                    <input
                      type="date"
                      name="event_date"
                      value={formData.event_date}
                      onChange={handleChange}
                      className="border-2 border-pink-200 rounded-lg px-3 py-1 focus:border-pink-400 focus:ring-4 focus:ring-pink-100 outline-none"
                    />
                  ) : (
                    <span className="font-medium">
                      {formatDate(event?.event_date)}
                    </span>
                  )}
                </div>
              </div>

              {editing ? (
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Event description..."
                  className="w-full mt-4 border-2 border-pink-200 rounded-xl px-4 py-3 focus:border-pink-400 focus:ring-4 focus:ring-pink-100 outline-none resize-none"
                />
              ) : (
                <p className="text-gray-600 mt-4">
                  {event?.description || "No description provided."}
                </p>
              )}
            </div>

            <div className="flex gap-2 ml-4">
              {editing ? (
                <>
                  <button
                    onClick={handleUpdate}
                    className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <Save size={18} />
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setFormData({
                        name: event.name,
                        description: event.description || "",
                        event_date: event.event_date,
                        status: event.status,
                      });
                    }}
                    className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <X size={18} />
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <Edit2 size={18} />
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Registration Link Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border-2 border-green-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-green-100 p-2 rounded-lg">
              <Link className="text-green-600" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">Registration Link</h3>
              <p className="text-sm text-gray-500">Share this link with participants to register</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 font-mono text-sm text-gray-700 overflow-x-auto">
              {registrationLink}
            </div>
            
            <button
              onClick={handleCopyLink}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${
                copied 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {copied ? (
                <>
                  <Check size={18} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={18} />
                  Copy
                </>
              )}
            </button>
            
            <button
              onClick={() => window.open(registrationLink, '_blank')}
              className="flex items-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold transition-colors"
            >
              <ExternalLink size={18} />
              Preview
            </button>
          </div>
          
          {event?.status !== 'registration_open' && (
            <div className="mt-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl px-4 py-3">
              <p className="text-sm text-yellow-800">
                ⚠️ <strong>Note:</strong> Registration is currently closed. Change the event status to "Registration Open" to allow participants to register.
              </p>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-blue-100">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-xl">
                <Users className="text-blue-600" size={28} />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Participants</p>
                <p className="text-3xl font-bold text-gray-800">{participantCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-pink-100">
            <div className="flex items-center gap-4">
              <div className="bg-pink-100 p-3 rounded-xl">
                <Heart
                  className="text-pink-600"
                  size={28}
                  fill="currentColor"
                />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Matches Made</p>
                <p className="text-3xl font-bold text-gray-800">0</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-purple-100">
            <div className="flex items-center gap-4">
              <div className="bg-purple-100 p-3 rounded-xl">
                <MapPin className="text-purple-600" size={28} />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Venues</p>
                <p className="text-3xl font-bold text-gray-800">{venueCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Form Configuration - NOW CLICKABLE */}
          <div 
            onClick={() => navigate(`/organizer/events/${id}/form`)}
            className="bg-white rounded-2xl shadow-lg p-8 border-2 border-pink-100 hover:shadow-xl transition-shadow cursor-pointer group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="bg-gradient-to-br from-pink-400 to-red-400 p-4 rounded-2xl">
                <FileText className="text-white" size={32} />
              </div>
              <span className="text-pink-600 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Registration Form</h3>
            <p className="text-gray-600 mb-4">Configure custom questions for participant signups</p>
            <div className="text-sm text-pink-600 font-medium">Customize form →</div>
          </div>

          {/* Venue Management - CLICKABLE */}
          <div 
            onClick={() => navigate(`/organizer/events/${id}/venues`)}
            className="bg-white rounded-2xl shadow-lg p-8 border-2 border-purple-100 hover:shadow-xl transition-shadow cursor-pointer group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="bg-gradient-to-br from-purple-400 to-indigo-400 p-4 rounded-2xl">
                <MapPin className="text-white" size={32} />
              </div>
              <span className="text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity">
                →
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Venues</h3>
            <p className="text-gray-600 mb-4">Add and manage pubs and date locations</p>
            <div className="text-sm text-purple-600 font-medium">Manage venues →</div>
          </div>

          {/* Matches */}
          <div
            onClick={() => navigate(`/organizer/events/${id}/matches`)}
            className="bg-white rounded-2xl shadow-lg p-8 border-2 border-blue-100 hover:shadow-xl transition-shadow cursor-pointer group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="bg-gradient-to-br from-blue-400 to-cyan-400 p-4 rounded-2xl">
                <Heart className="text-white" size={32} fill="currentColor" />
              </div>
              <span className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                →
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Matches</h3>
            <p className="text-gray-600 mb-4">Create and manage participant matches</p>
            <div className="text-sm text-blue-600 font-medium">Manage matches →</div>
          </div>

          {/* Participants */}
          <div
            onClick={() => navigate(`/organizer/events/${id}/participants`)}
            className="bg-white rounded-2xl shadow-lg p-8 border-2 border-green-100 hover:shadow-xl transition-shadow cursor-pointer group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="bg-gradient-to-br from-green-400 to-emerald-400 p-4 rounded-2xl">
                <Users className="text-white" size={32} />
              </div>
              <span className="text-green-600 opacity-0 group-hover:opacity-100 transition-opacity">
                →
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              Participants
            </h3>
            <p className="text-gray-600 mb-4">View and manage event signups</p>
            <div className="text-sm text-green-600 font-medium">View participants →</div>
          </div>
        </div>
      </main>
    </div>
  );
}
