import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Calendar, Users, Sparkles, Heart } from "lucide-react";
import { eventAPI, participantAPI, matchAPI } from '../services/api';
import Header from '../components/organizer/Header';

export default function Dashboard() {
  const { user } = useAuth();

  const [stats, setStats] = useState({
    totalEvents: 0,
    totalParticipants: 0,
    totalMatches: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Fetch all events
      const eventsRes = await eventAPI.getAll();
      const events = eventsRes.data;

      // Fetch participants and matches for each event
      let totalParticipants = 0;
      let totalMatches = 0;

      await Promise.all(
        events.map(async (event) => {
          try {
            const [participantsRes, matchesRes] = await Promise.all([
              participantAPI.getAll(event.id).catch(() => ({ data: [] })),
              matchAPI.getAll(event.id).catch(() => ({ data: [] }))
            ]);
            totalParticipants += participantsRes.data.length;
            totalMatches += matchesRes.data.length;
          } catch (err) {
            // Skip events with errors
          }
        })
      );

      setStats({
        totalEvents: events.length,
        totalParticipants,
        totalMatches
      });
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-red-50 to-orange-50">
      <Header activePage="dashboard" />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Card */}
        <div className="bg-white rounded-3xl shadow-xl p-8 mb-8 border-2 border-pink-100 animate-slideUp">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-gradient-to-br from-pink-400 to-red-400 p-4 rounded-2xl">
              <Sparkles className="text-white" size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-800">
                Welcome, {user?.name}! 👋
              </h2>
              <p className="text-gray-600 mt-1">
                Ready to create some magical matches?
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-pink-50 to-red-50 rounded-2xl p-6 border-2 border-pink-200">
            <p className="text-gray-700 text-lg">
              🎉 You're all set! Your matcher account is active and ready to go.
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div
            className="bg-white rounded-2xl shadow-lg p-6 border-2 border-purple-100 hover:shadow-xl transition-shadow animate-slideUp"
            style={{ animationDelay: "0.1s" }}
          >
            <div className="flex items-center gap-4">
              <div className="bg-purple-100 p-3 rounded-xl">
                <Calendar className="text-purple-600" size={28} />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Events Created</p>
                <p className="text-3xl font-bold text-gray-800">
                  {loading ? '...' : stats.totalEvents}
                </p>
              </div>
            </div>
          </div>

          <div
            className="bg-white rounded-2xl shadow-lg p-6 border-2 border-blue-100 hover:shadow-xl transition-shadow animate-slideUp"
            style={{ animationDelay: "0.2s" }}
          >
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-xl">
                <Users className="text-blue-600" size={28} />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Total Participants</p>
                <p className="text-3xl font-bold text-gray-800">
                  {loading ? '...' : stats.totalParticipants}
                </p>
              </div>
            </div>
          </div>

          <div
            className="bg-white rounded-2xl shadow-lg p-6 border-2 border-pink-100 hover:shadow-xl transition-shadow animate-slideUp"
            style={{ animationDelay: "0.3s" }}
          >
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
                <p className="text-3xl font-bold text-gray-800">
                  {loading ? '...' : stats.totalMatches}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div
          className="bg-white rounded-3xl shadow-xl p-8 border-2 border-pink-100 animate-slideUp"
          style={{ animationDelay: "0.4s" }}
        >
          <h3 className="text-2xl font-bold text-gray-800 mb-4">
            ✨ Available Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 text-gray-700">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>✓ Create and manage Qpid events</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>✓ Customize registration forms</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>✓ Participant management</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>✓ Venue management</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>✓ Manual matching</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>✓ Match-to-venue assignment</span>
            </div>
            <div className="flex items-center gap-3 text-gray-500">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span>🔜 Smart matching algorithm</span>
            </div>
            <div className="flex items-center gap-3 text-gray-500">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span>🔜 Participant notifications</span>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-slideUp {
          animation: slideUp 0.6s ease-out;
          animation-fill-mode: both;
        }
      `}</style>
    </div>
  );
}