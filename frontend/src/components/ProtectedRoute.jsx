import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Loading spinner component.
 */
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-red-50 to-orange-50">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-600 text-lg">Loading...</p>
    </div>
  </div>
);

/**
 * Generic protected route wrapper with role-based access control.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to render if authorized
 * @param {string} [props.requiredRole] - Optional role required for access ('matcher' or 'participant')
 * @param {string} [props.redirectTo] - Custom redirect path (default based on route)
 */
export function ProtectedRoute({ children, requiredRole, redirectTo }) {
  const { isAuthenticated, loading, hasRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  // Not authenticated - redirect to appropriate login
  if (!isAuthenticated) {
    const defaultRedirect = location.pathname.startsWith('/organizer')
      ? '/organizer/login'
      : '/find/login';
    return <Navigate to={redirectTo || defaultRedirect} state={{ from: location }} replace />;
  }

  // Check role if required
  if (requiredRole && !hasRole(requiredRole)) {
    // If matcher role required but user doesn't have it, redirect to upgrade page
    if (requiredRole === 'matcher') {
      return <Navigate to="/organizer/upgrade" replace />;
    }
    // For other role mismatches, redirect to home
    return <Navigate to="/" replace />;
  }

  return children;
}

/**
 * Protected route for organizer/matcher portal.
 * Requires 'matcher' role.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 */
export function OrganizerRoute({ children }) {
  return (
    <ProtectedRoute requiredRole="matcher" redirectTo="/organizer/login">
      {children}
    </ProtectedRoute>
  );
}

/**
 * Protected route for participant portal.
 * Requires 'participant' role (which all authenticated users have by default).
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 */
export function ParticipantRoute({ children }) {
  return (
    <ProtectedRoute requiredRole="participant" redirectTo="/find/login">
      {children}
    </ProtectedRoute>
  );
}

export default ProtectedRoute;
