// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const createServerClientWithCookies = async () => {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Enhanced cookie options for mobile compatibility
              const enhancedOptions = {
                ...options,
                sameSite: 'lax' as const,
                secure: process.env.NODE_ENV === 'production',
                httpOnly: false, // Allow client-side access for Supabase
                maxAge: 60 * 60 * 24 * 7, // 7 days
                path: '/',
              }
              cookieStore.set(name, value, enhancedOptions)
            })
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
