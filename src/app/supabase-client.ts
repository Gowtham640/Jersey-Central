import { createBrowserClient } from '@supabase/ssr'

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? {
        getItem: (key: string) => {
          try {
            // Try localStorage first
            const localStorageValue = window.localStorage.getItem(key);
            if (localStorageValue) return localStorageValue;
            
            // Fallback to sessionStorage
            const sessionStorageValue = window.sessionStorage.getItem(key);
            if (sessionStorageValue) return sessionStorageValue;
            
            // Final fallback to cookies
            const cookies = document.cookie.split(';');
            const cookie = cookies.find(c => c.trim().startsWith(`${key}=`));
            return cookie ? cookie.split('=')[1] : null;
          } catch {
            // If any storage method fails, try cookies as last resort
            try {
              const cookies = document.cookie.split(';');
              const cookie = cookies.find(c => c.trim().startsWith(`${key}=`));
              return cookie ? cookie.split('=')[1] : null;
            } catch {
              return null;
            }
          }
        },
        setItem: (key: string, value: string) => {
          try {
            // Try localStorage first
            window.localStorage.setItem(key, value);
          } catch {
            try {
              // Fallback to sessionStorage
              window.sessionStorage.setItem(key, value);
            } catch {
              // Final fallback to cookies
              try {
                document.cookie = `${key}=${value}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
              } catch {
                console.warn('Failed to persist session data');
              }
            }
          }
        },
        removeItem: (key: string) => {
          try {
            window.localStorage.removeItem(key);
          } catch {
            try {
              window.sessionStorage.removeItem(key);
            } catch {
              try {
                document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
              } catch {
                console.warn('Failed to remove session data');
              }
            }
          }
        }
      } : undefined,
      storageKey: 'supabase-auth-token',
      // Additional mobile-specific settings
      flowType: 'pkce',
      debug: process.env.NODE_ENV === 'development',
    },
    global: {
      headers: {
        'X-Client-Info': 'jc3-nextjs',
      },
    },
  }
)