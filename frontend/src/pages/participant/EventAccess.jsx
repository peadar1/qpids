import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { publicEventAPI } from '../../services/api';
import { Heart, Key, ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';

/**
 * Event access page for entering private event codes.
 * Validates the code and redirects to registration if valid.
 */
export default function EventAccess() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validEvent, setValidEvent] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setValidEvent(null);
    setLoading(true);

    try {
      const response = await publicEventAPI.validateAccessCode(code.trim());
      setValidEvent({
        id: response.data.event_id,
        name: response.data.event_name
      });
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Invalid access code. Please check and try again.');
      } else if (err.response?.status === 400) {
        setError(err.response?.data?.detail || 'This event is not currently accepting registrations.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (validEvent) {
      // Navigate to registration with access code in URL params
      navigate(`/events/${validEvent.id}/register?code=${encodeURIComponent(code.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-red-50 to-orange-50 flex flex-col">
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
                  Enter Event Code
                </h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl p-8 border-2 border-orange-100">
            {/* Icon */}
            <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Key className="text-white" size={40} />
            </div>

            <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">
              Access Private Event
            </h2>
            <p className="text-gray-600 text-center mb-6">
              Enter the code provided by the event organizer to access a private event.
            </p>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
                {error}
              </div>
            )}

            {/* Success State */}
            {validEvent ? (
              <div className="space-y-6">
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="text-green-600" size={24} />
                    <div>
                      <p className="font-semibold text-green-800">Code Valid!</p>
                      <p className="text-green-700">{validEvent.name}</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleContinue}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  Continue to Registration
                  <ArrowRight size={20} />
                </button>

                <button
                  onClick={() => {
                    setValidEvent(null);
                    setCode('');
                  }}
                  className="w-full text-gray-600 hover:text-gray-800 font-medium py-2 transition-colors"
                >
                  Enter a different code
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Code Input */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Event Code
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:ring-4 focus:ring-orange-100 outline-none transition-all text-center text-2xl font-mono tracking-widest"
                    placeholder="XXXX-XXXX"
                    maxLength={20}
                    required
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || !code.trim()}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Validating...
                    </>
                  ) : (
                    <>
                      <Key size={20} />
                      Validate Code
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Browse Link */}
            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Looking for public events?{' '}
                <Link
                  to="/find/browse"
                  className="text-pink-600 font-semibold hover:text-pink-700 transition-colors"
                >
                  Browse events
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-gray-500 border-t border-pink-100">
        <Link to="/" className="hover:text-gray-700 transition-colors">
          <Heart className="inline text-pink-500 mr-1" size={16} fill="currentColor" />
          Qpids Matcher
        </Link>
      </footer>
    </div>
  );
}
