import { Navigate } from 'react-router';
import { useAuth } from './AuthContext';
import LoadingState from '../components/ui/LoadingState';

export default function RequireAuth({ children }) {
  const { user, loading, configured, error } = useAuth();
  if (loading) return <main className="flex-1 p-10"><LoadingState label="Opening your account…" /></main>;
  if (!configured || error) return <main className="flex-1 p-10" role="alert">{error || 'Connect Supabase to use your account. See docs/BACKEND_SETUP.md.'}</main>;
  return user ? children : <Navigate to="/login" replace />;
}
