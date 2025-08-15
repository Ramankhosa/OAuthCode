import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";

// Initialize Prisma client
const prisma = new PrismaClient();

// Define schema for validation
const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// This function can be imported and used in your application
export async function registerUser(
  name: string,
  email: string,
  password: string
) {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return {
        success: false,
        message: "User already exists",
        status: 400,
      };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        oauth_provider: "email",
      },
    });

    // Don't send password in response
    const { password: _, ...userWithoutPassword } = newUser;

    return {
      success: true,
      message: "User registered successfully",
      user: userWithoutPassword,
      status: 201,
    };
  } catch (error) {
    console.error("Registration error:", error);
    return {
      success: false,
      message: "Internal server error",
      status: 500,
    };
  }
}

// Default export for API route
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
  } finally {
    await prisma.$disconnect();
  }
}
