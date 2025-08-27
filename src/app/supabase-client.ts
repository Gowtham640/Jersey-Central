import {createClient} from '@supabase/supabase-js'


export const supabase=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
        auth: {
          persistSession: true,  // keeps user session in storage
          autoRefreshToken: true, // refreshes tokens automatically
          detectSessionInUrl: true, // handles sign-in redirects
        },
      }
      
);