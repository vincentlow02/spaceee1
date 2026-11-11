import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { createGenerationJobsRepository } from '@/features/exploration/generationJobsRepository';
import { verifiedGuest } from './server';

export function createSupabaseServiceClient() {
  const serviceRoleKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) throw new Error('GENERATION_JOB_SERVICE_KEY_UNAVAILABLE');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey,
    {auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}},
  );
}

export async function createVerifiedGenerationJobsRepository(expectedOwnerId) {
  const {user} = await verifiedGuest();
  if (!expectedOwnerId || user.id !== expectedOwnerId) {
    throw new Error('GENERATION_JOB_OWNER_MISMATCH');
  }
  const supabase=createSupabaseServiceClient();
  return createGenerationJobsRepository(supabase, user.id);
}

\r\n