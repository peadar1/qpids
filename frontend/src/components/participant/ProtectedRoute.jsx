import { Navigate } from 'react-router-dom';
import { useParticipantAuth } from '../../context/ParticipantAuthContext';

/**
 * Protected route wrapper for the participant portal.
 * Redirects to participant login if user is not authenticated.
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to render if authenticated
 */
export default function ParticipantProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useParticipantAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-red-50 to-orange-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/find/login" replace />;
  }

  return children;
}
