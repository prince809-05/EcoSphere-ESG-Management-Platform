import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'ecosphere-super-secret-esg-jwt-token-key-2026'
);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Define public routes
  const isPublicRoute = pathname === '/login' || pathname === '/register';

  // Get session cookie
  const sessionToken = request.cookies.get('session')?.value;

  let session: any = null;
  if (sessionToken) {
    try {
      const { payload } = await jwtVerify(sessionToken, JWT_SECRET, {
        algorithms: ['HS256'],
      });
      session = payload;
    } catch (error) {
      // Invalid token, clear it
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('session');
      return response;
    }
  }

  // Redirect unauthenticated users to login
  if (!session) {
    if (!isPublicRoute) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // User is authenticated, redirect from login/register to dashboard
  if (isPublicRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Role-Based Access Control (RBAC)
  const role = session.role;

  // ADMIN only routes
  if (pathname.startsWith('/settings')) {
    if (role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/?error=Forbidden', request.url));
    }
  }

  // ADMIN + AUDITOR routes
  if (pathname.startsWith('/governance/audits')) {
    if (role !== 'ADMIN' && role !== 'AUDITOR') {
      return NextResponse.redirect(new URL('/?error=Forbidden', request.url));
    }
  }

  // ADMIN + AUDITOR + MANAGER routes
  if (pathname.startsWith('/reports')) {
    if (role !== 'ADMIN' && role !== 'AUDITOR' && role !== 'MANAGER') {
      return NextResponse.redirect(new URL('/?error=Forbidden', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/',
    '/environmental/:path*',
    '/social/:path*',
    '/governance/:path*',
    '/gamification/:path*',
    '/reports/:path*',
    '/settings/:path*',
    '/login',
    '/register',
  ],
};
