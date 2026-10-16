import { NextResponse, type NextRequest } from 'next/server';

/**
 * CFA Buddy is a public, credential-free application.
 * All routes are accessible without authentication.
 * This middleware simply passes every request through.
 */
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
