import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ParticipantAuthProvider } from "./context/ParticipantAuthContext";

// Shared pages
import Landing from "./pages/Landing";
import ParticipantRegistration from "./pages/ParticipantRegistration";
import VerifyEmail from "./pages/VerifyEmail";

// Organizer portal pages
import OrganizerLogin from "./pages/organizer/Login";
import OrganizerSignup from "./pages/organizer/Signup";
import OrganizerProtectedRoute from "./components/organizer/ProtectedRoute";

// Original organizer pages (keeping existing paths for now)
import Dashboard from "./pages/Dashboard";
import Events from "./pages/Events";
import CreateEvent from "./pages/CreateEvent";
import EventDetail from "./pages/EventDetail";
import FormBuilder from "./pages/FormBuilder";
import Participants from "./pages/Participants";
import Venues from "./pages/Venues";
import Matches from "./pages/Matches";

// Participant portal pages
import ParticipantHome from "./pages/participant/Home";
import ParticipantLogin from "./pages/participant/Login";
import EventBrowse from "./pages/participant/EventBrowse";
import EventAccess from "./pages/participant/EventAccess";
import MyMatches from "./pages/participant/MyMatches";
import MyEvents from "./pages/participant/MyEvents";
import AuthCallback from "./pages/participant/AuthCallback";
import ParticipantProtectedRoute from "./components/participant/ProtectedRoute";

/**
 * Main application component with dual-portal routing.
 *
 * Route structure:
 * - / - Landing page (portal selection)
 * - /organizer/* - Organizer portal (event management)
 * - /find/* - Participant portal (event discovery & matches)
 * - /events/:eventId/register - Public registration (works with/without auth)
 * - /auth/callback - OAuth callback handler
 */
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ParticipantAuthProvider>
          <Routes>
            {/* Landing page - Portal selection */}
            <Route path="/" element={<Landing />} />

            {/* OAuth callback - must be outside both portals */}
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* ==================== ORGANIZER PORTAL ==================== */}

            {/* Organizer auth routes */}
            <Route path="/organizer/login" element={<OrganizerLogin />} />
            <Route path="/organizer/signup" element={<OrganizerSignup />} />
            <Route path="/verify-email" element={<VerifyEmail />} />

            {/* Organizer protected routes */}
            <Route
              path="/organizer/dashboard"
              element={
                <OrganizerProtectedRoute>
                  <Dashboard />
                </OrganizerProtectedRoute>
              }
            />
            <Route
              path="/organizer/events"
              element={
                <OrganizerProtectedRoute>
                  <Events />
                </OrganizerProtectedRoute>
              }
            />
            <Route
              path="/organizer/events/create"
              element={
                <OrganizerProtectedRoute>
                  <CreateEvent />
                </OrganizerProtectedRoute>
              }
            />
            <Route
              path="/organizer/events/:id"
              element={
                <OrganizerProtectedRoute>
                  <EventDetail />
                </OrganizerProtectedRoute>
              }
            />
            <Route
              path="/organizer/events/:eventId/form"
              element={
                <OrganizerProtectedRoute>
                  <FormBuilder />
                </OrganizerProtectedRoute>
              }
            />
            <Route
              path="/organizer/events/:eventId/participants"
              element={
                <OrganizerProtectedRoute>
                  <Participants />
                </OrganizerProtectedRoute>
              }
            />
            <Route
              path="/organizer/events/:eventId/venues"
              element={
                <OrganizerProtectedRoute>
                  <Venues />
                </OrganizerProtectedRoute>
              }
            />
            <Route
              path="/organizer/events/:eventId/matches"
              element={
                <OrganizerProtectedRoute>
                  <Matches />
                </OrganizerProtectedRoute>
              }
            />

            {/* ==================== PARTICIPANT PORTAL ==================== */}

            {/* Participant public routes */}
            <Route path="/find" element={<ParticipantHome />} />
            <Route path="/find/login" element={<ParticipantLogin />} />
            <Route path="/find/browse" element={<EventBrowse />} />
            <Route path="/find/code" element={<EventAccess />} />

            {/* Participant protected routes */}
            <Route
              path="/find/my-matches"
              element={
                <ParticipantProtectedRoute>
                  <MyMatches />
                </ParticipantProtectedRoute>
              }
            />
            <Route
              path="/find/my-events"
              element={
                <ParticipantProtectedRoute>
                  <MyEvents />
                </ParticipantProtectedRoute>
              }
            />

            {/* ==================== SHARED ROUTES ==================== */}

            {/* Public event registration (works for both portals) */}
            <Route
              path="/events/:eventId/register"
              element={<ParticipantRegistration />}
            />

            {/* ==================== LEGACY REDIRECTS ==================== */}

            {/* Redirect old routes to new organizer portal */}
            <Route path="/login" element={<Navigate to="/organizer/login" replace />} />
            <Route path="/signup" element={<Navigate to="/organizer/signup" replace />} />
            <Route path="/dashboard" element={<Navigate to="/organizer/dashboard" replace />} />
            <Route path="/events" element={<Navigate to="/organizer/events" replace />} />
            <Route path="/events/create" element={<Navigate to="/organizer/events/create" replace />} />
            <Route path="/events/:id" element={<Navigate to="/organizer/events/:id" replace />} />

            {/* Default fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ParticipantAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
