// Export authentication components
export { default as Login } from './components/Login';
export { default as Signup } from './components/Signup';

// Export API routes - Authentication
export { default as NextAuthHandler, createAuthOptions } from './api/auth/[...nextauth]';
export { default as RegisterHandler, registerUser } from './api/auth/register';

// Export API routes - Project Management
export { default as ProjectHandler, projectHandler } from './api/projects/index';
export { default as ProjectDetailHandler, projectDetailHandler } from './api/projects/[id]';

// Export middleware
export { createAuthMiddleware } from './middleware/authMiddleware';

// Export types
export type { NextAuthOptions } from 'next-auth';
export type { 
  Project, 
  ProjectStage, 
  CreateProjectInput, 
  UpdateProjectInput,
  ProjectResponse,
  ProjectsResponse
} from './types/project';
