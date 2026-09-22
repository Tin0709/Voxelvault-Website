import { Navigate } from 'react-router';
import { useAuth } from './AuthContext';

export default function RequireAuth({ children }) {
  const { user, loading, configured, error } = useAuth();
  if (loading) return <main className="flex-1 p-10" role="status">Checking your session…</main>;
  if (!configured || error) return <main className="flex-1 p-10" role="alert">{error || 'Connect Supabase to use your account. See docs/BACKEND_SETUP.md.'}</main>;
  return user ? children : <Navigate to="/login" replace />;
}
