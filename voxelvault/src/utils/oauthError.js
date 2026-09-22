export function getOAuthError(location) {
  const hash = new URLSearchParams(location.hash.slice(1));
  const query = new URLSearchParams(location.search);
  const description = hash.get('error_description') || query.get('error_description');
  const code = hash.get('error_code') || query.get('error_code');
  if (!description && !hash.has('error') && !query.has('error')) return '';
  let message = description || 'Sign-in could not be completed. Please try again.';
  // Some Auth redirects encode the description twice. Never decode without a guard.
  try { message = decodeURIComponent(message); } catch { /* Keep malformed descriptions readable. */ }
  if (message.includes('Unable to exchange external code')) {
    return 'The sign-in provider could not complete authentication with Supabase. Check the provider credentials and the Supabase Auth log for /callback, then start a new sign-in attempt.';
  }
  return `${message}${code ? ` (${code})` : ''}`;
}
