import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api } from './api';

export function usePostList(path = '/posts') {
  const { user, loading: authLoading } = useAuth();
  const key = `${user?.id ?? 'public'}:${path}`;
  const [page, setPage] = useState(null);
  const [result, setResult] = useState(null);
  const offset = page?.key === key ? page.offset : 0;
  useEffect(() => {
    if (authLoading) return;
    const controller = new AbortController();
    api(`${path}${path.includes('?') ? '&' : '?'}offset=${offset}`, { signal: controller.signal }).then((data) => {
      if (!controller.signal.aborted) setResult((current) => ({
        key, offset, posts: offset && current?.key === key ? [...current.posts, ...data.posts] : data.posts,
        hasMore: data.hasMore, error: '',
      }));
    }).catch((error) => {
      if (!controller.signal.aborted) setResult((current) => ({
        key, offset, posts: current?.key === key ? current.posts : [], hasMore: false, error: error.message,
      }));
    });
    return () => controller.abort();
  }, [key,path,offset,authLoading]);
  const current = result?.key === key && !authLoading ? result : null;
  return {
    data: current, error: current?.error ?? '', loading: !current,
    loadingMore: Boolean(current && current.offset !== offset),
    loadMore: () => setPage({ key, offset: offset + 50 }),
  };
}
