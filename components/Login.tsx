import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";

type LoginFormValues = {
  email: string;
  password: string;
};

interface LoginProps {
  redirectPath?: string;
  appName?: string;
  appDescription?: string;
  forgotPasswordLink?: string;
  signupLink?: string;
  enableSocialLogin?: boolean;
}

export default function Login({
  redirectPath = "/dashboard",
  appName = "Application",
  appDescription = "Sign in to continue",
  forgotPasswordLink = "/auth/forgot-password",
  signupLink = "/auth/signup",
  enableSocialLogin = false,
}: LoginProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>();

  useEffect(() => {
    // Check and log authentication configuration
    console.log('NextAuth Configuration Check:');
    console.log('- Window Location:', window.location.href);
    console.log('- Origin:', window.location.origin);
    console.log('- Cookies Enabled:', navigator.cookieEnabled);
    console.log('- localStorage Available:', typeof window.localStorage !== 'undefined');
    
    // Attempt to detect any obvious browser security issues
    const securityIssues: string[] = [];
    if (!navigator.cookieEnabled) {
      securityIssues.push('Cookies are disabled in browser');
    }
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      securityIssues.push('Using non-HTTPS connection with external IP (may cause cookie issues)');
    }
    
    if (securityIssues.length > 0) {
      console.warn('Potential security issues detected:', securityIssues.join(', '));
    }
  }, []);

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: data.email,
        password: data.password,
      });

      if (result?.error) {
        setError("Invalid credentials. Please try again.");
        return;
      }

      // Redirect on successful login
      router.push(redirectPath);
    } catch (error) {
      setError("An error occurred. Please try again.");
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">{appName}</h1>
          <p className="text-gray-600 mt-2">{appDescription}</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-center mb-2">Welcome Back!</h2>
          <p className="text-gray-600 text-center mb-6">Please sign in to your account</p>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="mb-4">
              <label 
                htmlFor="email" 
                className="block text-gray-700 text-sm font-medium mb-1"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Invalid email address",
                  },
                })}
              />
              {errors.email && (
                <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>

            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <label 
                  htmlFor="password" 
                  className="block text-gray-700 text-sm font-medium"
                >
                  Password
                </label>
                <Link 
                  href={forgotPasswordLink}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...register("password", {
                  required: "Password is required",
                })}
              />
              {errors.password && (
                <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {enableSocialLogin && (
            <>
              <div className="mt-6 flex items-center justify-center">
                <hr className="w-full border-gray-300" />
                <span className="px-3 text-gray-500 bg-white">or</span>
                <hr className="w-full border-gray-300" />
              </div>

              <div className="mt-4 space-y-3">
                <button
                  onClick={() => signIn("google")}
                  className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 rounded-md py-2 px-4 hover:bg-gray-50"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Sign in with Google
                </button>

                <button
                  onClick={() => signIn("linkedin")}
                  className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 rounded-md py-2 px-4 hover:bg-gray-50"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#0A66C2">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                  </svg>
                  Sign in with LinkedIn
                </button>

                <button
                  onClick={() => signIn("github")}
                  className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 rounded-md py-2 px-4 hover:bg-gray-50"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.163 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.933.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.16 22 16.42 22 12c0-5.523-4.477-10-10-10z" />
                  </svg>
                  Sign in with GitHub
                </button>
              </div>
            </>
          )}

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Don&apos;t have an account?{" "}
              <Link
                href={signupLink}
                className="text-blue-600 hover:underline"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
