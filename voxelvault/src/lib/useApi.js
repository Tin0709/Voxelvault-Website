import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api } from './api';

export function useApi(path) {
  const { user, loading: authLoading } = useAuth();
  const key = `${user?.id ?? 'public'}:${path}`;
  const [result, setResult] = useState(null);
  useEffect(() => {
    if (!path || authLoading) return;
    const controller = new AbortController();
    api(path, { signal: controller.signal }).then((data) => {
      if (!controller.signal.aborted) setResult({ key, data, error: '' });
    }).catch((error) => {
      if (!controller.signal.aborted) setResult({ key, data: null, error: error.message });
    });
    return () => controller.abort();
  }, [path, key, authLoading]);
  return result?.key === key && !authLoading ? { ...result, loading: false } : { data: null, error: '', loading: Boolean(path) };
}
