import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

interface AuthMiddlewareOptions {
  protectedPaths?: string[];
  publicPaths?: string[];
  loginPath?: string;
  corsEnabled?: boolean;
  corsAllowedOrigins?: string[];
  corsAllowedMethods?: string[];
  corsAllowedHeaders?: string[];
}

/**
 * Creates a middleware function for authentication protection
 * @param options Configuration options for the middleware
 * @returns A middleware function that can be used in Next.js
 */
export function createAuthMiddleware(options: AuthMiddlewareOptions = {}) {
  const {
    protectedPaths = [],
    publicPaths = [],
    loginPath = '/auth/login',
    corsEnabled = false,
    corsAllowedOrigins = ['*'],
    corsAllowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    corsAllowedHeaders = ['X-CSRF-Token', 'X-Requested-With', 'Accept', 'Accept-Version', 'Content-Length', 'Content-MD5', 'Content-Type', 'Date', 'X-Api-Version'],
  } = options;

  return async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    
    // Check if the path is explicitly public
    if (publicPaths.some(path => pathname.startsWith(path))) {
      const response = NextResponse.next();
      
      // Add CORS headers if enabled
      if (corsEnabled && pathname.startsWith('/api/')) {
        response.headers.set('Access-Control-Allow-Credentials', 'true');
        response.headers.set('Access-Control-Allow-Origin', corsAllowedOrigins.join(', '));
        response.headers.set('Access-Control-Allow-Methods', corsAllowedMethods.join(', '));
        response.headers.set('Access-Control-Allow-Headers', corsAllowedHeaders.join(', '));
      }
      
      return response;
    }
    
    // Check if the path should be protected
    const isProtectedPath = protectedPaths.length === 0 || 
                            protectedPaths.some(path => pathname.startsWith(path));
    
    if (!isProtectedPath) {
      return NextResponse.next();
    }
    
    // Get the JWT token
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: process.env.NODE_ENV === "production" || 
                   request.url.includes('https'),
    });
    
    // If user is not authenticated, redirect to sign-in
    if (!token) {
      const signInUrl = new URL(loginPath, request.url);
      signInUrl.searchParams.set('callbackUrl', request.url);
      return NextResponse.redirect(signInUrl);
    }
    
    // User is authenticated, continue
    const response = NextResponse.next();
    
    // Add CORS headers for API routes if enabled
    if (corsEnabled && pathname.startsWith('/api/')) {
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Access-Control-Allow-Origin', corsAllowedOrigins.join(', '));
      response.headers.set('Access-Control-Allow-Methods', corsAllowedMethods.join(', '));
      response.headers.set('Access-Control-Allow-Headers', corsAllowedHeaders.join(', '));
    }
    
    return response;
  };
}

/**
 * Example usage:
 * 
 * // In your middleware.ts file:
 * import { createAuthMiddleware } from './auth-package/middleware/authMiddleware';
 * 
 * export const middleware = createAuthMiddleware({
 *   protectedPaths: ['/dashboard', '/profile', '/api/protected'],
 *   publicPaths: ['/api/public', '/auth', '/'],
 *   loginPath: '/auth/login',
 *   corsEnabled: true,
 * });
 * 
 * export const config = {
 *   matcher: [
 *     '/dashboard/:path*',
 *     '/profile/:path*',
 *     '/api/protected/:path*',
 *     '/api/public/:path*',
 *   ],
 * };
 */
