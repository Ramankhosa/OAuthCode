# Next.js Authentication Package

A reusable authentication module for Next.js applications with Prisma and NextAuth.js.

## Features

- Complete authentication system with NextAuth.js
- Email/password authentication
- OAuth providers (Google, GitHub, LinkedIn)
- User registration
- Login/Signup components
- Authentication middleware
- TypeScript support
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

Copy the authentication schema to your Prisma schema:

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

  @@map("users")
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

### 3. Set up middleware (optional)

Create the file `middleware.ts` in your project root:

```typescript
import { createAuthMiddleware } from 'nextjs-auth-package';

export const middleware = createAuthMiddleware({
  protectedPaths: ['/dashboard', '/profile', '/api/protected'],
  publicPaths: ['/api/public', '/auth', '/'],
  loginPath: '/auth/login',
  corsEnabled: true,
});

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/profile/:path*',
    '/api/protected/:path*',
    '/api/public/:path*',
  ],
};
```

### 4. Create login page

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

### 5. Create signup page

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

## License

MIT
