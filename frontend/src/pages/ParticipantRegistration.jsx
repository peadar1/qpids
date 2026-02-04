import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { eventAPI, formQuestionAPI, participantAPI, publicEventAPI } from '../services/api';
import { useParticipantAuth } from '../context/ParticipantAuthContext';
import {
  Heart,
  Sparkles,
  User,
  Mail,
  Phone,
  Calendar,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  LogIn
} from 'lucide-react';

export default function ParticipantRegistration() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const accessCode = searchParams.get('code');

  // Get participant auth context - authentication is now required
  const { user: participantUser, isAuthenticated, loading: authLoading } = useParticipantAuth();

  const [event, setEvent] = useState(null);
  const [customQuestions, setCustomQuestions] = useState([]);
  const [disabledStandardFields, setDisabledStandardFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Standard form fields
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    interested_in: '',
    bio: '',
  });

  // Custom question answers
  const [customAnswers, setCustomAnswers] = useState({});

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      // Build redirect URL with access code if present
      let redirectPath = `/events/${eventId}/register`;
      if (accessCode) {
        redirectPath += `?code=${accessCode}`;
      }
      navigate(`/find/login?redirect=${encodeURIComponent(redirectPath)}`);
    }
  }, [authLoading, isAuthenticated, eventId, accessCode, navigate]);

  // Pre-fill form with authenticated user data
  useEffect(() => {
    if (isAuthenticated && participantUser) {
      setFormData(prev => ({
        ...prev,
        name: participantUser.name || prev.name,
        email: participantUser.email || prev.email,
        phone: participantUser.phone_number || prev.phone,
        date_of_birth: participantUser.date_of_birth || prev.date_of_birth,
      }));
    }
  }, [isAuthenticated, participantUser]);

  useEffect(() => {
    fetchEventAndQuestions();
  }, [eventId, accessCode]);

  const fetchEventAndQuestions = async () => {
    try {
      // Try to get event - use public endpoint with access code if provided
      let eventRes;
      try {
        // First try the public API endpoint which handles access codes
        eventRes = await publicEventAPI.getEvent(eventId, accessCode);
      } catch (publicErr) {
        // Fall back to standard public endpoint if public API fails
        eventRes = await eventAPI.getPublic(eventId);
      }

      const questionsRes = await formQuestionAPI.getPublic(eventId);

      setEvent(eventRes.data);
      setCustomQuestions(questionsRes.data);

      // Load disabled standard fields from event settings
      const settings = eventRes.data.settings || {};
      setDisabledStandardFields(settings.disabled_standard_fields || []);

      // Initialize custom answers
      const initialAnswers = {};
      questionsRes.data.forEach(q => {
        if (q.question_type === 'multi_select' || q.question_type === 'checkbox') {
          initialAnswers[q.question_key] = [];
        } else {
          initialAnswers[q.question_key] = '';
        }
      });
      setCustomAnswers(initialAnswers);

      // Check if registration is open
      if (eventRes.data.status !== 'registration_open') {
        setError('Registration is not currently open for this event.');
      }

      setLoading(false);
    } catch (err) {
      if (err.response?.status === 403) {
        setError('This is a private event. Please use a valid access code.');
      } else {
        setError('Event not found or registration is closed.');
      }
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleCustomChange = (questionKey, value, questionType) => {
    if (questionType === 'multi_select' || questionType === 'checkbox') {
      setCustomAnswers(prev => {
        const current = prev[questionKey] || [];
        if (current.includes(value)) {
          return { ...prev, [questionKey]: current.filter(v => v !== value) };
        } else {
          return { ...prev, [questionKey]: [...current, value] };
        }
      });
    } else {
      setCustomAnswers({
        ...customAnswers,
        [questionKey]: value,
      });
    }
  };

  const calculateAge = (dateOfBirth) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Check if a standard field is enabled
  const isFieldEnabled = (fieldKey) => {
    return !disabledStandardFields.includes(fieldKey);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const age = calculateAge(formData.date_of_birth);
    if (age < 18) {
      setError('You must be at least 18 years old to register.');
      setSubmitting(false);
      return;
    }

    // Validate required custom questions
    for (const question of customQuestions) {
      if (question.is_required) {
        const answer = customAnswers[question.question_key];
        if (!answer || (Array.isArray(answer) && answer.length === 0)) {
          setError(`Please answer: ${question.question_text}`);
          setSubmitting(false);
          return;
        }
      }
    }

    try {
      // Use the public event API for registration (supports access codes)
      await publicEventAPI.register(eventId, {
        ...formData,
        // Only include phone if enabled
        phone: isFieldEnabled('phone') ? formData.phone : '',
        // Only include bio if enabled
        bio: isFieldEnabled('bio') ? formData.bio : '',
        age: age,
        form_answers: customAnswers,
      }, accessCode);
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit registration. Please try again.');
    }
    
    setSubmitting(false);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Render custom question input based on type
  const renderCustomInput = (question) => {
    const value = customAnswers[question.question_key];
    
    switch (question.question_type) {
      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => handleCustomChange(question.question_key, e.target.value, question.question_type)}
            rows={3}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-400 focus:ring-4 focus:ring-pink-100 outline-none transition-all resize-none"
            placeholder="Enter your answer..."
            required={question.is_required}
          />
        );
      
      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => handleCustomChange(question.question_key, e.target.value, question.question_type)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-400 focus:ring-4 focus:ring-pink-100 outline-none transition-all appearance-none bg-white"
            required={question.is_required}
          >
            <option value="">Select...</option>
            {question.options?.map((opt, i) => (
              <option key={i} value={opt}>{opt}</option>
            ))}
          </select>
        );
      
      case 'multi_select':
      case 'checkbox':
        return (
          <div className="space-y-2">
            {question.options?.map((opt, i) => (
              <label key={i} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(value || []).includes(opt)}
                  onChange={() => handleCustomChange(question.question_key, opt, question.question_type)}
                  className="w-5 h-5 rounded border-2 border-gray-300 text-pink-500 focus:ring-pink-400"
                />
                <span className="text-gray-700">{opt}</span>
              </label>
            ))}
          </div>
        );
      
      case 'radio':
        return (
          <div className="space-y-2">
            {question.options?.map((opt, i) => (
              <label key={i} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name={question.question_key}
                  checked={value === opt}
                  onChange={() => handleCustomChange(question.question_key, opt, question.question_type)}
                  className="w-5 h-5 border-2 border-gray-300 text-pink-500 focus:ring-pink-400"
                />
                <span className="text-gray-700">{opt}</span>
              </label>
            ))}
          </div>
        );
      
      case 'number':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => handleCustomChange(question.question_key, e.target.value, question.question_type)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-400 focus:ring-4 focus:ring-pink-100 outline-none transition-all"
            placeholder="Enter a number..."
            required={question.is_required}
          />
        );
      
      case 'email':
        return (
          <input
            type="email"
            value={value || ''}
            onChange={(e) => handleCustomChange(question.question_key, e.target.value, question.question_type)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-400 focus:ring-4 focus:ring-pink-100 outline-none transition-all"
            placeholder="email@example.com"
            required={question.is_required}
          />
        );
      
      default: // text
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleCustomChange(question.question_key, e.target.value, question.question_type)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-400 focus:ring-4 focus:ring-pink-100 outline-none transition-all"
            placeholder="Enter your answer..."
            required={question.is_required}
          />
        );
    }
  };

  // Loading state (including auth check)
  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-red-50 to-orange-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading registration...</p>
        </div>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl p-8 border-2 border-green-100 text-center animate-slideUp">
            <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="text-green-600" size={48} />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">You're Registered!</h2>
            <p className="text-gray-600 mb-6">
              Thanks for signing up for <strong>{event?.name}</strong>!
            </p>

            <div className="bg-pink-50 border-2 border-pink-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-pink-800">
                📅 Event Date: <strong>{formatDate(event?.event_date)}</strong>
              </p>
            </div>

            <p className="text-gray-500 text-sm mb-4">
              Keep an eye on your email for updates and match details!
            </p>

            <Link
              to="/find/my-events"
              className="inline-flex items-center gap-2 text-pink-600 font-semibold hover:text-pink-700 transition-colors"
            >
              View My Events <ArrowRight size={18} />
            </Link>
          </div>
        </div>

        <style>{`
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-slideUp {
            animation: slideUp 0.6s ease-out;
          }
        `}</style>
      </div>
    );
  }

  // Error state (event not found or closed)
  if (error && !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-3xl shadow-2xl p-8 border-2 border-red-100">
            <div className="bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="text-red-600" size={48} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Oops!</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="text-pink-600 font-semibold hover:text-pink-700 transition-colors"
            >
              ← Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-red-50 to-orange-50 py-8 px-4">
      {/* Animated background hearts */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-10">
        {[...Array(15)].map((_, i) => (
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

      <div className="max-w-2xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8 animate-fadeIn">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Heart className="text-pink-500" size={48} fill="currentColor" />
            <Sparkles className="text-orange-400" size={32} />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 via-red-500 to-orange-500 bg-clip-text text-transparent mb-2">
            Cupid's Matcher
          </h1>
        </div>

        {/* Event Info Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border-2 border-pink-100 animate-slideUp">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{event?.name}</h2>
          <div className="flex items-center gap-2 text-gray-600 mb-3">
            <Calendar size={18} className="text-pink-500" />
            <span>{formatDate(event?.event_date)}</span>
          </div>
          {event?.description && (
            <p className="text-gray-600">{event.description}</p>
          )}
        </div>

        {/* Registration Form */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 border-2 border-pink-100 animate-slideUp" style={{ animationDelay: '0.1s' }}>
          <h3 className="text-2xl font-bold text-gray-800 mb-6">Register for this Event</h3>

          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-3 animate-shake">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* === STANDARD QUESTIONS === */}
            
            {/* Name - Always required */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-400 focus:ring-4 focus:ring-pink-100 outline-none transition-all"
                  placeholder="Your full name"
                  required
                />
              </div>
            </div>

            {/* Email - Always required */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-400 focus:ring-4 focus:ring-pink-100 outline-none transition-all"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            {/* Phone - Toggleable */}
            {isFieldEnabled('phone') && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-400 focus:ring-4 focus:ring-pink-100 outline-none transition-all"
                    placeholder="+353 87 123 4567"
                    required
                  />
                </div>
              </div>
            )}

            {/* Date of Birth - Always required */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="date"
                  name="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={handleChange}
                  max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-400 focus:ring-4 focus:ring-pink-100 outline-none transition-all"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">You must be at least 18 years old</p>
            </div>

            {/* Gender & Interested In - Always required */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  I am <span className="text-red-500">*</span>
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-400 focus:ring-4 focus:ring-pink-100 outline-none transition-all appearance-none bg-white"
                  required
                >
                  <option value="">Select...</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="non_binary">Non-binary</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Interested in <span className="text-red-500">*</span>
                </label>
                <select
                  name="interested_in"
                  value={formData.interested_in}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-400 focus:ring-4 focus:ring-pink-100 outline-none transition-all appearance-none bg-white"
                  required
                >
                  <option value="">Select...</option>
                  <option value="male">Men</option>
                  <option value="female">Women</option>
                  <option value="everyone">Everyone</option>
                </select>
              </div>
            </div>

            {/* Bio - Toggleable */}
            {isFieldEnabled('bio') && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Tell us about yourself
                </label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-400 focus:ring-4 focus:ring-pink-100 outline-none transition-all resize-none"
                  placeholder="What are your hobbies? What are you looking for?"
                />
              </div>
            )}

            {/* === CUSTOM QUESTIONS === */}
            {customQuestions.length > 0 && (
              <>
                <div className="border-t-2 border-gray-100 pt-6 mt-6">
                  <h4 className="text-lg font-bold text-gray-800 mb-4">Additional Questions</h4>
                </div>
                
                {customQuestions.map((question) => (
                  <div key={question.id}>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      {question.question_text}
                      {question.is_required && <span className="text-red-500"> *</span>}
                    </label>
                    {renderCustomInput(question)}
                  </div>
                ))}
              </>
            )}

            {/* Info Box */}
            <div className="bg-pink-50 border-2 border-pink-200 rounded-xl p-4">
              <p className="text-sm text-pink-800">
                💕 <strong>How it works:</strong> After registration closes, our matching algorithm will pair you with compatible people. You'll receive your match details before the event date!
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || event?.status !== 'registration_open'}
              className="w-full bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Heart size={20} fill="currentColor" />
                  Register Now
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>Powered by Cupid's Matcher 💕</p>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(10deg); }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        
        .animate-float {
          animation: float 8s ease-in-out infinite;
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out;
        }
        
        .animate-slideUp {
          animation: slideUp 0.6s ease-out;
          animation-fill-mode: both;
        }
        
        .animate-shake {
          animation: shake 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}