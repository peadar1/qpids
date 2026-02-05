import axios from 'axios';
import { API_BASE_URL } from '../config';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests if it exists
api.interceptors.request.use((config) => {
  // Don't override explicitly-set Authorization headers (e.g., from withToken())
  if (config.headers.Authorization) {
    return config;
  }

  const organizerToken = localStorage.getItem('token');
  if (organizerToken) {
    config.headers.Authorization = `Bearer ${organizerToken}`;
    return config;
  }

  const participantToken = localStorage.getItem('participant_token');
  if (participantToken) {
    config.headers.Authorization = `Bearer ${participantToken}`;
  }

  return config;
});

// Auth API calls
export const authAPI = {
  signup: (data) => api.post('/api/auth/signup', data),
  login: (data) => api.post('/api/auth/login', data),
};

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

// Participant API calls
export const participantAPI = {
  // Public registration (no auth required)
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

// ==================== PARTICIPANT PORTAL API ====================

/**
 * Create an axios instance that uses a specific token.
 * Used for participant auth where token might come from Supabase.
 * @param {string} token - Bearer token to use
 * @returns {Object} Axios config with auth header
 */
const withToken = (token) => ({
  headers: { Authorization: `Bearer ${token}` }
});

// Participant Auth API calls
export const participantAuthAPI = {
  /**
   * Sign up with email and password.
   * @param {Object} data - { name, email, password }
   */
  signup: (data) => api.post('/api/participant-auth/signup', data),

  /**
   * Login with email and password.
   * @param {Object} data - { email, password }
   */
  login: (data) => api.post('/api/participant-auth/login', data),

  /**
   * Get current participant profile.
   * Uses provided token (for OAuth) or stored token (for email auth).
   * @param {string} [token] - Optional bearer token
   */
  getMe: (token) => token
    ? api.get('/api/participant-auth/me', withToken(token))
    : api.get('/api/participant-auth/me'),

  /**
   * Update current participant profile.
   * @param {Object} data - Profile fields to update
   * @param {string} [token] - Optional bearer token
   */
  updateMe: (data, token) => token
    ? api.put('/api/participant-auth/me', data, withToken(token))
    : api.put('/api/participant-auth/me', data),

  /**
   * Delete current participant account.
   * @param {string} [token] - Optional bearer token
   */
  deleteMe: (token) => token
    ? api.delete('/api/participant-auth/me', withToken(token))
    : api.delete('/api/participant-auth/me'),
};

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
   * Register for an event (supports both auth and anonymous).
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
