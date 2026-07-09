import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Always skip API routes and static assets
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check if Supabase is properly configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase is not configured or has placeholder values, skip all auth
  // This allows the entire app to run without authentication in development
  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    supabaseUrl.includes('placeholder') ||
    supabaseAnonKey.includes('placeholder') ||
    supabaseAnonKey === 'your-anon-key'
  ) {
    return NextResponse.next();
  }

  // Supabase IS configured — perform auth check
  let supabaseResponse = NextResponse.next({ request });

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    const { data: { user } } = await supabase.auth.getUser();

    // Auth pages - redirect logged-in users to dashboard
    const authPages = ['/sign-in', '/sign-up', '/reset-password'];
    if (user && authPages.includes(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }

    // If user is NOT authenticated and trying to access a protected route,
    // redirect to sign-in. But ONLY if Supabase auth is working correctly.
    const publicPaths = ['/sign-in', '/sign-up', '/reset-password', '/auth/callback', '/'];
    const isPublicPath = publicPaths.some(p => pathname === p || pathname.startsWith(p + '/'));

    if (!user && !isPublicPath) {
      const url = request.nextUrl.clone();
      url.pathname = '/sign-in';
      return NextResponse.redirect(url);
    }

    // Root redirect
    if (pathname === '/') {
      const url = request.nextUrl.clone();
      url.pathname = user ? '/dashboard' : '/sign-in';
      return NextResponse.redirect(url);
    }
  } catch {
    // If Supabase auth fails for any reason (network, invalid keys, etc.),
    // don't block the user — just pass through without auth.
    return NextResponse.next();
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
