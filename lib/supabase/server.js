import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function serverSupabase() {
  const jar = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: values => values.forEach(({name,value,options}) => jar.set(name,value,options)),
    },
  });
}

export async function verifiedGuest() {
  const supabase = await serverSupabase();
  const {data, error} = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('SESSION_UNAVAILABLE');
  return {supabase, user:data.user};
}
