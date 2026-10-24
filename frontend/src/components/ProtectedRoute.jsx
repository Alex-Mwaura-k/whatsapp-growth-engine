import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

const ProtectedRoute = ({ children, requireComplete = false }) => {
  // 1. Grab the global state! No more API calls here.
  const { user, loading } = useAuth();
  const location = useLocation();

  // 2. If the context is still fetching the user data on initial load
  if (loading) {
    return <div className="h-screen flex items-center justify-center font-bold text-blue-600">Loading...</div>;
  }

  // 3. If there is no user object in the context, they aren't authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 4. If they need a complete profile to view this route but don't have one
  if (requireComplete && !user.is_profile_complete) {
    return <Navigate to="/profile" replace />;
  }

  // 5. Access Granted!
  return children;
};

export default ProtectedRoute;