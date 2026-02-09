import axios from 'axios';
import { API_BASE_URL } from '../config';
import { supabase } from './supabase';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Single interceptor - use Supabase session token
api.interceptors.request.use(async (config) => {
  // Don't override explicitly-set Authorization headers
  if (config.headers.Authorization) {
    return config;
  }

  // Get current Supabase session
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }

  return config;
});

// Event API calls
export const eventAPI = {
  // Protected routes (require auth)
  getAll: () => api.get('/api/events'),
  getById: (id) => api.get(`/api/events/${id}`),
  create: (data) => api.post('/api/events', data),
  update: (id, data) => api.put(`/api/events/${id}`, data),
  delete: (id) => api.delete(`/api/events/${id}`),

  // Public route (no auth required) - for participant registration
  getPublic: (id) => api.get(`/api/events/${id}/public`),
};

// Venue API calls
export const venueAPI = {
  getAll: (eventId) => api.get(`/api/events/${eventId}/venues`),
  getById: (eventId, venueId) => api.get(`/api/events/${eventId}/venues/${venueId}`),
  create: (eventId, data) => api.post(`/api/events/${eventId}/venues`, data),
  update: (eventId, venueId, data) => api.put(`/api/events/${eventId}/venues/${venueId}`, data),
  delete: (eventId, venueId) => api.delete(`/api/events/${eventId}/venues/${venueId}`),
};

// Participant API calls (for organizers managing participants)
export const participantAPI = {
  // Registration (requires participant auth)
  register: (eventId, data) => api.post(`/api/events/${eventId}/participants/register`, data),

  // Protected routes (for event organizers)
  getAll: (eventId) => api.get(`/api/events/${eventId}/participants`),
  getById: (eventId, participantId) => api.get(`/api/events/${eventId}/participants/${participantId}`),
  update: (eventId, participantId, data) => api.put(`/api/events/${eventId}/participants/${participantId}`, data),
  delete: (eventId, participantId) => api.delete(`/api/events/${eventId}/participants/${participantId}`),
};

// Form Question API calls
export const formQuestionAPI = {
  getAll: (eventId) => api.get(`/api/events/${eventId}/form-questions`),
  getById: (eventId, questionId) => api.get(`/api/events/${eventId}/form-questions/${questionId}`),
  create: (eventId, data) => api.post(`/api/events/${eventId}/form-questions`, data),
  update: (eventId, questionId, data) => api.put(`/api/events/${eventId}/form-questions/${questionId}`, data),
  delete: (eventId, questionId) => api.delete(`/api/events/${eventId}/form-questions/${questionId}`),
  reorder: (eventId, data) => api.put(`/api/events/${eventId}/form-questions/reorder`, data),

  // Public route - get active questions for registration form
  getPublic: (eventId) => api.get(`/api/events/${eventId}/form-questions/public`),
};

// Match API calls
export const matchAPI = {
  getAll: (eventId) => api.get(`/api/events/${eventId}/matches`),
  getById: (eventId, matchId) => api.get(`/api/events/${eventId}/matches/${matchId}`),
  create: (eventId, data) => api.post(`/api/events/${eventId}/matches`, data),
  update: (eventId, matchId, data) => api.put(`/api/events/${eventId}/matches/${matchId}`, data),
  delete: (eventId, matchId) => api.delete(`/api/events/${eventId}/matches/${matchId}`),
  generate: (eventId) => api.post(`/api/events/${eventId}/matches/generate`),
};

// ==================== PUBLIC EVENTS API (Participant Portal) ====================

// Public Events API calls (for participant portal)
export const publicEventAPI = {
  /**
   * Browse public events open for registration.
   * @param {string} [area] - Optional area filter
   */
  browse: (area) => api.get('/api/public/events/browse', { params: { area } }),

  /**
   * Validate a private event access code.
   * @param {string} accessCode - The access code to validate
   */
  validateAccessCode: (accessCode) => api.post('/api/public/events/access-code', {
    access_code: accessCode
  }),

  /**
   * Get public event details.
   * @param {string} eventId - Event UUID
   * @param {string} [accessCode] - Optional access code for private events
   */
  getEvent: (eventId, accessCode) => api.get(`/api/public/events/${eventId}`, {
    params: accessCode ? { access_code: accessCode } : {}
  }),

  /**
   * Register for an event (requires auth).
   * @param {string} eventId - Event UUID
   * @param {Object} data - Registration data
   * @param {string} [accessCode] - Optional access code for private events
   */
  register: (eventId, data, accessCode) => api.post(
    `/api/public/events/${eventId}/register`,
    data,
    { params: accessCode ? { access_code: accessCode } : {} }
  ),

  /**
   * Get participant's registered events (requires auth).
   */
  getMyEvents: () => api.get('/api/public/events/my-events'),

  /**
   * Get participant's matches across all events (requires auth).
   */
  getMyMatches: () => api.get('/api/public/events/my-matches'),

  /**
   * Get list of available areas with public events.
   */
  getAreas: () => api.get('/api/public/areas'),
};

// Export the axios instance for direct use if needed
export default api;
