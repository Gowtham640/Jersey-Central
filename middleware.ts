import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            // Enhanced cookie options for mobile compatibility
            const enhancedOptions = {
              ...options,
              // Ensure cookies work on mobile
              sameSite: 'lax' as const,
              secure: process.env.NODE_ENV === 'production',
              httpOnly: false, // Allow client-side access for Supabase
              maxAge: 60 * 60 * 24 * 7, // 7 days
              path: '/',
            }
            supabaseResponse.cookies.set(name, value, enhancedOptions)
          })
        },
      },
    }
  )

  // IMPORTANT: Refresh session if expired
  const { data: { session } } = await supabase.auth.getSession()

  // Define protected routes and their required roles
  const protectedRoutes = {
    '/admin': 'admin',
    '/seller': 'seller',
    '/buyer/cart': 'buyer',
    '/buyer/checkout': 'buyer',
    '/buyer/orders': 'buyer',
  }

  // Check if current route is protected
  const currentPath = request.nextUrl.pathname
  const isProtectedRoute = Object.keys(protectedRoutes).some(route => 
    currentPath.startsWith(route)
  )

  if (isProtectedRoute && !session) {
    // No session, redirect to home page
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (isProtectedRoute && session) {
    // Check user role for protected routes
    try {
      let { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('user_id', session.user.id)
        .single()

      if (userError || !userData) {
        // User not found in public.users table - this is their first sign in
        // Check if they exist in auth.users
        const { data: authUser, error: authError } = await supabase.auth.getUser()
        
        if (!authError && authUser.user) {
          // User exists in auth.users but not in public.users - this is their first sign in
          // Since middleware can't insert with anon key, we'll redirect to a special route
          // that will handle user creation, then redirect back to the intended route
          const intendedRoute = request.nextUrl.pathname
          const redirectUrl = `/auth/create-user?redirect=${encodeURIComponent(intendedRoute)}`
          return NextResponse.redirect(new URL(redirectUrl, request.url))
        } else {
          // User doesn't exist in auth.users either, redirect to home
          return NextResponse.redirect(new URL('/', request.url))
        }
      }

      const userRole = userData.role
      const requiredRole = Object.entries(protectedRoutes).find(([route]) => 
        currentPath.startsWith(route)
      )?.[1]

      if (requiredRole && userRole !== requiredRole) {
        // Role mismatch, redirect based on actual role
        if (userRole === 'admin') {
          return NextResponse.redirect(new URL('/admin', request.url))
        } else if (userRole === 'seller') {
          return NextResponse.redirect(new URL('/seller', request.url))
        } else {
          return NextResponse.redirect(new URL('/', request.url))
        }
      }
    } catch (error) {
      // Error checking role, redirect to home
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
