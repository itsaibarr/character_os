import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

// In a real production environment with edge functions, 
// Upstash Redis or Vercel KV is highly recommended over Postgres for rate limiting.
// This is a Postgres fallback implementation.

export async function enforceRateLimit(
  userId: string, 
  action: 'nlp_parse' | 'ai_quest', 
  maxLimit: number
): Promise<void> {
  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        set(name: string, value: string, options: CookieOptions) {
          // not setting cookies here
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        remove(name: string, options: CookieOptions) {
          // not removing cookies here
        },
      }
    }
  )

  // A table `rate_limits` needs to exist: id, user_id, action, bucket_date, count
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

  // Optimistic increment (Postgres UPSERT via RPC or ON CONFLICT could be better)
  // For simplicity we fetch, check, and increment
  const { data: limitRecord, error: fetchError } = await supabase
    .from('rate_limits')
    .select('count')
    .eq('user_id', userId)
    .eq('action', action)
    .eq('bucket_date', today)
    .single()

  if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is not found
    console.error('Rate limit check failed:', fetchError)
    // Fail secure: if we can't check, we deny (or we could gracefully allow depending on risk tolerance)
    throw new Error('Internal server error during rate limiting.')
  }

  const currentCount = limitRecord?.count || 0

  if (currentCount >= maxLimit) {
    throw new Error(`Rate limit exceeded for ${action}. Max ${maxLimit} per day.`)
  }

  // Increment
  const { error: upsertError } = await supabase
    .from('rate_limits')
    .upsert(
      { 
        user_id: userId, 
        action, 
        bucket_date: today, 
        count: currentCount + 1 
      },
      { onConflict: 'user_id, action, bucket_date' }
    )

  if (upsertError) {
    console.error('Rate limit counter update failed:', upsertError)
    throw new Error('Internal server error updating rate limit.')
  }
}
