import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import LinkedInProvider from "next-auth/providers/linkedin";
import GitHubProvider from "next-auth/providers/github";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// This is a modular version that can be imported and configured
// without affecting the original application

// Initialize Prisma client
const prisma = new PrismaClient();

// Extend NextAuth types with custom properties
declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

// Helper function to determine the hostname for cookies
const getHostname = (externalIP: string, nextAuthUrl: string) => {
  if (!externalIP && !nextAuthUrl) return undefined;
  
  // For local development, don't set a specific domain
  if (externalIP === 'localhost') return undefined;
  
  // Extract domain from host
  try {
    const url = new URL(nextAuthUrl);
    // For ngrok URLs, don't set a domain as they need to use the full domain
    if (url.hostname.includes('ngrok')) {
      return undefined;
    }
    return url.hostname;
  } catch (e) {
    // Fallback to using externalIP directly
    if (externalIP.includes('.nip.io')) {
      return externalIP;
    }
    if (externalIP.includes('ngrok')) {
      return undefined;
    }
    return `${externalIP}.nip.io`;
  }
};

// Create a function that returns the auth options
export const createAuthOptions = (
  externalIP: string = '',
  nextAuthUrl: string = '',
  nextAuthSecret: string = '',
  googleClientId: string = '',
  googleClientSecret: string = '',
  githubId: string = '',
  githubSecret: string = '',
  linkedinClientId: string = '',
  linkedinClientSecret: string = '',
  customSignInPage: string = '/auth/login',
  customSignOutPage: string = '/auth/logout',
  customErrorPage: string = '/auth/error',
  customRedirectCallback?: (url: string, baseUrl: string) => string
): NextAuthOptions => {
  const isProduction = process.env.NODE_ENV === "production";
  const isExternalAccess = nextAuthUrl.includes('.nip.io') || 
                          nextAuthUrl.includes(externalIP) || 
                          nextAuthUrl.includes('ngrok');

  const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    providers: [
      CredentialsProvider({
        name: "Credentials",
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          try {
            const user = await prisma.user.findUnique({
              where: { email: credentials.email },
            });

            if (!user || !user.password) {
              return null;
            }

            const isPasswordValid = await bcrypt.compare(
              credentials.password,
              user.password
            );

            if (!isPasswordValid) {
              return null;
            }

            return {
              id: user.id,
              name: user.name,
              email: user.email,
            };
          } catch (error) {
            console.error("Authorization error:", error);
            return null;
          }
        },
      }),
    ],
    session: {
      strategy: "jwt",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    secret: nextAuthSecret,
    jwt: {
      maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    cookies: {
      sessionToken: {
        name: `next-auth.session-token`,
        options: {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: isProduction || nextAuthUrl.includes('https'),
          domain: isExternalAccess ? getHostname(externalIP, nextAuthUrl) : undefined,
        },
      },
      callbackUrl: {
        name: `next-auth.callback-url`,
        options: {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: isProduction || nextAuthUrl.includes('https'),
          domain: isExternalAccess ? getHostname(externalIP, nextAuthUrl) : undefined,
        },
      },
      csrfToken: {
        name: `next-auth.csrf-token`,
        options: {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: isProduction || nextAuthUrl.includes('https'),
          domain: isExternalAccess ? getHostname(externalIP, nextAuthUrl) : undefined,
        },
      },
    },
    pages: {
      signIn: customSignInPage,
      signOut: customSignOutPage,
      error: customErrorPage,
    },
    callbacks: {
      async jwt({ token, user }) {
        if (user) {
          token.id = user.id;
        }
        return token;
      },
      async session({ session, token }) {
        if (token && session.user) {
          session.user.id = token.id as string;
        }
        return session;
      },
      async redirect({ url, baseUrl }) {
        // Use custom redirect callback if provided
        if (customRedirectCallback) {
          return customRedirectCallback(url, baseUrl);
        }
        
        // Default redirect behavior
        if (url.startsWith(baseUrl)) {
          return url;
        } else if (url.startsWith('/')) {
          return `${baseUrl}${url}`;
        }
        return baseUrl;
      },
    },
    debug: process.env.NODE_ENV === "development",
    useSecureCookies: isProduction || nextAuthUrl.includes('https'),
  };

  // Add optional providers if credentials are provided
  if (googleClientId && googleClientSecret) {
    authOptions.providers.push(
      GoogleProvider({
        clientId: googleClientId,
        clientSecret: googleClientSecret,
      })
    );
  }

  if (githubId && githubSecret) {
    authOptions.providers.push(
      GitHubProvider({
        clientId: githubId,
        clientSecret: githubSecret,
      })
    );
  }

  if (linkedinClientId && linkedinClientSecret) {
    authOptions.providers.push(
      LinkedInProvider({
        clientId: linkedinClientId,
        clientSecret: linkedinClientSecret,
      })
    );
  }

  return authOptions;
};

// Default export for API route
export default function handler(req: any, res: any) {
  // Get environment variables
  const externalIP = process.env.EXTERNAL_IP || '';
  const nextAuthUrl = process.env.NEXTAUTH_URL || '';
  const nextAuthSecret = process.env.NEXTAUTH_SECRET || '';
  const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  const githubId = process.env.GITHUB_ID || '';
  const githubSecret = process.env.GITHUB_SECRET || '';
  const linkedinClientId = process.env.LINKEDIN_CLIENT_ID || '';
  const linkedinClientSecret = process.env.LINKEDIN_CLIENT_SECRET || '';

  // Create auth options with environment variables
  const authOptions = createAuthOptions(
    externalIP,
    nextAuthUrl,
    nextAuthSecret,
    googleClientId,
    googleClientSecret,
    githubId,
    githubSecret,
    linkedinClientId,
    linkedinClientSecret
  );

  return NextAuth(req, res, authOptions);
}
