# Next.js Authentication & Project Management Package

A reusable authentication and project management module for Next.js applications with Prisma and NextAuth.js.

## Features

### Authentication
- Complete authentication system with NextAuth.js
- Email/password authentication
- OAuth providers (Google, GitHub, LinkedIn)
- User registration
- Login/Signup components
- Authentication middleware
- TypeScript support
- Prisma integration

### Project Management
- Create, read, update, delete (CRUD) projects
- Project stages management
- User-specific projects
- Admin impersonation support
- TypeScript interfaces
- Prisma integration

## Installation

### 1. Install the package

```bash
npm install nextjs-auth-package
# or
yarn add nextjs-auth-package
```

### 2. Set up Prisma

First, make sure you have Prisma installed:

```bash
npm install prisma --save-dev
# or
yarn add prisma --dev
```

Initialize Prisma:

```bash
npx prisma init
```

Copy the authentication and project management schema to your Prisma schema:

```prisma
model User {
  id                String    @id @default(uuid())
  name              String
  email             String    @unique
  password          String?
  oauth_provider    String?
  oauth_provider_id String?
  profile_image     String?
  created_at        DateTime  @default(now())
  updated_at        DateTime  @updatedAt
  projects          Project[]

  @@map("users")
}

model Project {
  id                  String             @id @default(uuid())
  user_id             String
  project_title       String
  project_description String?
  tags                String[]
  created_at          DateTime           @default(now())
  updated_at          DateTime           @updatedAt
  stages              ProjectStage[]
  user                User               @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@map("projects")
}

model ProjectStage {
  id          String    @id @default(uuid())
  project_id  String
  stage_name  StageName
  user_inputs Json
  ai_outputs  Json
  finalized   Boolean   @default(false)
  created_at  DateTime  @default(now())
  updated_at  DateTime  @updatedAt
  project     Project   @relation(fields: [project_id], references: [id], onDelete: Cascade)

  @@unique([project_id, stage_name])
  @@map("project_stages")
}

enum StageName {
  Ideation
  Planning
  Research
  Development
  Testing
  Deployment
  Maintenance
  Review
}

model Account {
  id                String   @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?  @db.Text
  access_token      String?  @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?  @db.Text
  session_state     String?
  created_at        DateTime @default(now())
  updated_at        DateTime @updatedAt
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verification_tokens")
}
```

Generate the Prisma client:

```bash
npx prisma generate
```

Run migrations:

```bash
npx prisma migrate dev --name init
```

### 3. Set up environment variables

Create a `.env.local` file in your project root:

```
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/your_database"

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# OAuth Providers (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_ID=your-github-id
GITHUB_SECRET=your-github-secret
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
```

## Usage

### 1. Set up NextAuth API route

Create the file `pages/api/auth/[...nextauth].ts`:

```typescript
import { createAuthOptions } from 'nextjs-auth-package';
import NextAuth from 'next-auth';

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
  linkedinClientSecret,
  '/auth/login', // Custom sign-in page
  '/auth/logout', // Custom sign-out page
  '/auth/error', // Custom error page
  // Custom redirect callback (optional)
  (url, baseUrl) => {
    if (url.startsWith(baseUrl)) {
      if (url === `${baseUrl}/signin` || url === `${baseUrl}/login`) {
        return `${baseUrl}/dashboard`; // Redirect to dashboard after login
      }
      return url;
    } else if (url.startsWith('/')) {
      return `${baseUrl}${url}`;
    }
    return baseUrl;
  }
);

export default NextAuth(authOptions);
export { authOptions };
```

### 2. Create registration API route

Create the file `pages/api/auth/register.ts`:

```typescript
import { registerUser } from 'nextjs-auth-package';
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

// Define schema for validation
const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { name, email, password } = registerSchema.parse(req.body);
    
    const result = await registerUser(name, email, password);
    
    return res.status(result.status).json({
      message: result.message,
      ...(result.success && { user: result.user }),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }

    console.error("Registration error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
```

### 3. Set up Project API routes

Create the file `pages/api/projects/index.ts`:

```typescript
import { projectHandler } from 'nextjs-auth-package';
import type { NextApiRequest, NextApiResponse } from 'next';
import { authOptions } from '../auth/[...nextauth]';
import { StageName } from '@prisma/client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Define admin emails that can impersonate users
  const adminEmails = ['admin@example.com'];
  
  // Define custom stages if needed
  const customStages: StageName[] = [
    StageName.Ideation,
    StageName.Planning,
    StageName.Research,
    StageName.Development,
    // Add or remove stages as needed
  ];
  
  // Use the project handler with custom settings
  return projectHandler(
    req, 
    res, 
    authOptions, 
    adminEmails, 
    customStages,
    true, // Enable CORS
    'http://localhost:3000' // CORS origin
  );
}
```

Create the file `pages/api/projects/[id].ts`:

```typescript
import { projectDetailHandler } from 'nextjs-auth-package';
import type { NextApiRequest, NextApiResponse } from 'next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Use the project detail handler with custom settings
  return projectDetailHandler(
    req, 
    res, 
    authOptions,
    true, // Enable CORS
    'http://localhost:3000' // CORS origin
  );
}
```

### 4. Set up middleware (optional)

Create the file `middleware.ts` in your project root:

```typescript
import { createAuthMiddleware } from 'nextjs-auth-package';

export const middleware = createAuthMiddleware({
  protectedPaths: ['/dashboard', '/profile', '/api/protected', '/api/projects'],
  publicPaths: ['/api/public', '/auth', '/'],
  loginPath: '/auth/login',
  corsEnabled: true,
});

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/profile/:path*',
    '/api/protected/:path*',
    '/api/projects/:path*',
    '/api/public/:path*',
  ],
};
```

### 5. Create login page

Create the file `pages/auth/login.tsx`:

```typescript
import { Login } from 'nextjs-auth-package';

export default function LoginPage() {
  return (
    <Login 
      redirectPath="/dashboard"
      appName="Your App Name"
      appDescription="Your app description"
      forgotPasswordLink="/auth/forgot-password"
      signupLink="/auth/signup"
      enableSocialLogin={true}
    />
  );
}
```

### 6. Create signup page

Create the file `pages/auth/signup.tsx`:

```typescript
import { Signup } from 'nextjs-auth-package';

export default function SignupPage() {
  return (
    <Signup 
      registerEndpoint="/api/auth/register"
      redirectPath="/auth/login?registered=true"
      appName="Your App Name"
      appDescription="Create your account"
      loginLink="/auth/login"
      termsAndConditions={true}
    />
  );
}
```

### 7. Use project management in your frontend

Example of fetching projects in a React component:

```typescript
import { useState, useEffect } from 'react';
import { Project } from 'nextjs-auth-package';
import { useSession } from 'next-auth/react';

export default function ProjectList() {
  const { data: session } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProjects = async () => {
      if (!session) return;
      
      try {
        const response = await fetch('/api/projects');
        const data = await response.json();
        
        if (response.ok) {
          setProjects(data.projects);
        } else {
          setError(data.message || 'Failed to fetch projects');
        }
      } catch (err) {
        setError('An error occurred while fetching projects');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [session]);

  return (
    <div>
      <h1>My Projects</h1>
      
      {loading && <p>Loading projects...</p>}
      {error && <p className="text-red-500">{error}</p>}
      
      <ul>
        {projects.map(project => (
          <li key={project.id}>
            <h2>{project.project_title}</h2>
            <p>{project.project_description}</p>
            <div>
              {project.tags.map(tag => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

Example of creating a new project:

```typescript
import { useState } from 'react';
import { useRouter } from 'next/router';
import { CreateProjectInput } from 'nextjs-auth-package';

export default function CreateProject() {
  const router = useRouter();
  const [formData, setFormData] = useState<CreateProjectInput>({
    project_title: '',
    project_description: '',
    tags: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tags = e.target.value.split(',').map(tag => tag.trim());
    setFormData(prev => ({ ...prev, tags }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/projects');
      } else {
        setError(data.message || 'Failed to create project');
      }
    } catch (err) {
      setError('An error occurred while creating the project');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Create New Project</h1>
      
      {error && <p className="text-red-500">{error}</p>}
      
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="project_title">Project Title</label>
          <input
            id="project_title"
            name="project_title"
            type="text"
            value={formData.project_title}
            onChange={handleChange}
            required
          />
        </div>
        
        <div>
          <label htmlFor="project_description">Description</label>
          <textarea
            id="project_description"
            name="project_description"
            value={formData.project_description || ''}
            onChange={handleChange}
          />
        </div>
        
        <div>
          <label htmlFor="tags">Tags (comma separated)</label>
          <input
            id="tags"
            name="tags"
            type="text"
            value={formData.tags?.join(', ')}
            onChange={handleTagsChange}
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create Project'}
        </button>
      </form>
    </div>
  );
}
```

## Customization

### Custom Login Component

You can customize the Login component by passing props:

```typescript
<Login 
  redirectPath="/custom-redirect"
  appName="Custom App Name"
  appDescription="Custom description"
  forgotPasswordLink="/custom-forgot-password"
  signupLink="/custom-signup"
  enableSocialLogin={true}
/>
```

### Custom Signup Component

You can customize the Signup component by passing props:

```typescript
<Signup 
  registerEndpoint="/api/custom-register"
  redirectPath="/custom-redirect"
  appName="Custom App Name"
  appDescription="Custom description"
  loginLink="/custom-login"
  termsAndConditions={true}
  additionalFields={
    <div className="mb-4">
      <label htmlFor="custom" className="block text-gray-700 text-sm font-medium mb-1">
        Custom Field
      </label>
      <input
        id="custom"
        type="text"
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
      />
    </div>
  }
/>
```

### Custom Project Stages

You can define custom project stages in your Prisma schema:

```prisma
enum StageName {
  Requirements
  Design
  Implementation
  Testing
  Deployment
  Maintenance
}
```

Then use these custom stages when creating projects:

```typescript
import { projectHandler } from 'nextjs-auth-package';
import { StageName } from '@prisma/client';

// Define custom stages
const customStages: StageName[] = [
  StageName.Requirements,
  StageName.Design,
  StageName.Implementation,
  StageName.Testing,
  StageName.Deployment,
];

// Use in project handler
return projectHandler(req, res, authOptions, [], customStages);
```

## License

MIT