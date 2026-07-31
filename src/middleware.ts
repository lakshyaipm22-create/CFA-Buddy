import { NextResponse, type NextRequest } from 'next/server';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function middleware(_request: NextRequest) {
  // Auth bypass: all routes are accessible without authentication.
  // Supabase auth is kept in the codebase but the middleware is a pass-through
  // so the app works locally without a working auth backend.
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
