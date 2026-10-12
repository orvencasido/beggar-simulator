import { createClient } from '@supabase/supabase-js';
import { gameStorage } from '@/storage/game-storage';
import type { Database } from './database.types';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://tjegdubzwwgfkcdaufle.supabase.co';
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const timedFetch: typeof fetch = async (input, init) => {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (init?.signal?.aborted) cancel();
  else init?.signal?.addEventListener('abort', cancel);
  const timeout = setTimeout(cancel, 15000);
  try { return await fetch(input, { ...init, signal: controller.signal }); }
  finally { clearTimeout(timeout); init?.signal?.removeEventListener('abort', cancel); }
};
export const supabase = key ? createClient<Database>(url, key, {
  global: { fetch: timedFetch },
  auth: {
    storage: { getItem: gameStorage.get, setItem: gameStorage.set, removeItem: gameStorage.remove },
    autoRefreshToken: true, persistSession: true, detectSessionInUrl: false,
  },
}) : null;
