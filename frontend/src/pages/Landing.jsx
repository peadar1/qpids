import { useNavigate } from 'react-router-dom';
import { Heart, Sparkles, Users, Calendar, Search, Key } from 'lucide-react';

/**
 * Landing page with split-screen design for portal selection.
 * Users can choose between the participant portal (Find Your Match)
 * and the organizer portal (Organize Events).
 */
export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-red-50 to-orange-50">
      {/* Animated background hearts */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-10">
        {[...Array(30)].map((_, i) => (
          <Heart
            key={i}
            className="absolute text-pink-400 animate-float"
            size={Math.random() * 40 + 20}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${Math.random() * 10 + 5}s`,
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="py-6 px-8">
          <div className="flex items-center justify-center gap-3">
            <Heart className="text-pink-500" size={40} fill="currentColor" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 via-red-500 to-orange-500 bg-clip-text text-transparent">
              Qpids Matcher
            </h1>
            <Sparkles className="text-orange-400" size={28} />
          </div>
        </header>

        {/* Split Screen Portals */}
        <main className="flex-1 flex flex-col lg:flex-row items-stretch justify-center gap-8 p-8 max-w-7xl mx-auto w-full">
          {/* Participant Portal Card */}
          <div
            onClick={() => navigate('/find')}
            className="flex-1 bg-white rounded-3xl shadow-2xl p-8 border-2 border-pink-100 cursor-pointer transform hover:scale-[1.02] hover:shadow-3xl transition-all duration-300 flex flex-col items-center justify-center text-center min-h-[400px] group"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-pink-400 to-red-500 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Search className="text-white" size={48} />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Find Your Match</h2>
            <p className="text-gray-600 text-lg mb-6 max-w-sm">
              Browse events, register for matchmaking, and discover your perfect connection.
            </p>
            <div className="space-y-3 text-left w-full max-w-xs">
              <div className="flex items-center gap-3 text-gray-600">
                <Calendar className="text-pink-500" size={20} />
                <span>Browse public events</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <Key className="text-pink-500" size={20} />
                <span>Access private events with codes</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <Heart className="text-pink-500" size={20} />
                <span>View your matches</span>
              </div>
            </div>
            <button className="mt-8 bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all">
              Get Started
            </button>
          </div>

          {/* Organizer Portal Card */}
          <div
            onClick={() => navigate('/organizer/login')}
            className="flex-1 bg-white rounded-3xl shadow-2xl p-8 border-2 border-orange-100 cursor-pointer transform hover:scale-[1.02] hover:shadow-3xl transition-all duration-300 flex flex-col items-center justify-center text-center min-h-[400px] group"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Users className="text-white" size={48} />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Organize Events</h2>
            <p className="text-gray-600 text-lg mb-6 max-w-sm">
              Create matchmaking events, manage participants, and help people find love.
            </p>
            <div className="space-y-3 text-left w-full max-w-xs">
              <div className="flex items-center gap-3 text-gray-600">
                <Calendar className="text-orange-500" size={20} />
                <span>Create and manage events</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <Users className="text-orange-500" size={20} />
                <span>Track registrations</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <Sparkles className="text-orange-500" size={20} />
                <span>Generate matches</span>
              </div>
            </div>
            <button className="mt-8 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all">
              Organizer Login
            </button>
          </div>
        </main>

        {/* Footer */}
        <footer className="py-6 text-center text-gray-500">
          <p>Made with <Heart className="inline text-pink-500" size={16} fill="currentColor" /> by Qpids</p>
        </footer>
      </div>

      {/* Custom CSS for animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(10deg); }
        }

        .animate-float {
          animation: float 8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
