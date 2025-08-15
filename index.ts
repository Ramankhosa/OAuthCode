// Export authentication components
export { default as Login } from './components/Login';
export { default as Signup } from './components/Signup';

// Export API routes
export { default as NextAuthHandler, createAuthOptions } from './api/auth/[...nextauth]';
export { default as RegisterHandler, registerUser } from './api/auth/register';

// Export middleware
export { createAuthMiddleware } from './middleware/authMiddleware';

// Export types
export type { NextAuthOptions } from 'next-auth';
