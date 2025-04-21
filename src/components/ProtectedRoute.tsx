import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  console.log('ProtectedRoute - Auth state:', { hasUser: !!user, loading });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-blue-200 rounded-full mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-16"></div>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login with the current path as "from"
  if (!user) {
    console.log('No authenticated user, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}