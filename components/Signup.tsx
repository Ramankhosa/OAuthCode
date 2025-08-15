import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useForm } from "react-hook-form";

type SignupFormValues = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

interface SignupProps {
  registerEndpoint?: string;
  redirectPath?: string;
  appName?: string;
  appDescription?: string;
  loginLink?: string;
  additionalFields?: React.ReactNode;
  termsAndConditions?: boolean;
}

export default function Signup({
  registerEndpoint = "/api/auth/register",
  redirectPath = "/auth/login?registered=true",
  appName = "Application",
  appDescription = "Create your account",
  loginLink = "/auth/login",
  additionalFields,
  termsAndConditions = false,
}: SignupProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupFormValues>();

  const password = watch("password");

  const onSubmit = async (data: SignupFormValues) => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(registerEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "An error occurred during signup");
        return;
      }

      // Redirect after successful signup
      router.push(redirectPath);
    } catch (error) {
      setError("An error occurred. Please try again.");
      console.error("Signup error:", error);
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
          <h2 className="text-2xl font-semibold text-center mb-2">Create Account</h2>
          <p className="text-gray-600 text-center mb-6">Join {appName} today</p>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="mb-4">
              <label 
                htmlFor="name" 
                className="block text-gray-700 text-sm font-medium mb-1"
              >
                Full Name
              </label>
              <input
                id="name"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...register("name", {
                  required: "Name is required",
                })}
              />
              {errors.name && (
                <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

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
              <label 
                htmlFor="password" 
                className="block text-gray-700 text-sm font-medium mb-1"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...register("password", {
                  required: "Password is required",
                  minLength: {
                    value: 8,
                    message: "Password must be at least 8 characters",
                  },
                })}
              />
              {errors.password && (
                <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>
              )}
            </div>

            <div className="mb-4">
              <label 
                htmlFor="confirmPassword" 
                className="block text-gray-700 text-sm font-medium mb-1"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...register("confirmPassword", {
                  required: "Please confirm your password",
                  validate: value => 
                    value === password || "The passwords do not match",
                })}
              />
              {errors.confirmPassword && (
                <p className="text-red-600 text-sm mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Render additional fields if provided */}
            {additionalFields}

            {termsAndConditions && (
              <div className="mb-4">
                <div className="flex items-start">
                  <input
                    id="terms"
                    type="checkbox"
                    className="mt-1"
                    {...register("terms", {
                      required: "You must agree to the terms and conditions",
                    })}
                  />
                  <label htmlFor="terms" className="ml-2 text-sm text-gray-600">
                    I agree to the <a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a> and <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>
                  </label>
                </div>
                {errors.terms && (
                  <p className="text-red-600 text-sm mt-1">{errors.terms.message}</p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
            >
              {isLoading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{" "}
              <Link
                href={loginLink}
                className="text-blue-600 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
