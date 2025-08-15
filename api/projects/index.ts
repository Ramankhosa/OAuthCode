import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { PrismaClient, StageName } from "@prisma/client";

// Initialize Prisma client
const prisma = new PrismaClient();

// Schema for project creation validation
const createProjectSchema = z.object({
  project_title: z.string().min(1, "Project title is required"),
  project_description: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  user_id: z.string().optional(), // Optional for admin impersonation
});

/**
 * Project handler function that can be used directly or customized
 * @param req NextApiRequest
 * @param res NextApiResponse
 * @param authOptions NextAuth options
 * @param adminEmails Array of admin emails that can impersonate users
 * @param customStages Custom stage names to use instead of default ones
 * @param corsEnabled Whether to enable CORS
 * @param corsOrigin CORS origin to allow
 */
export async function projectHandler(
  req: NextApiRequest,
  res: NextApiResponse,
  authOptions: any,
  adminEmails: string[] = [],
  customStages: StageName[] = [],
  corsEnabled: boolean = false,
  corsOrigin: string = '*'
) {
  // Set CORS headers if enabled
  if (corsEnabled) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', corsOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
  }

  // Use getServerSession to get the user session
  const session = await getServerSession(req, res, authOptions);
  
  if (!session || !session.user) {
    return res.status(401).json({ message: "Unauthorized - No valid session" });
  }

  // Access user id
  let userId = session.user.id;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized - Missing user ID" });
  }

  // Check if admin is impersonating a user
  const isAdminImpersonating = req.headers['x-admin-impersonating'] === 'true';
  const impersonatedUserId = req.headers['x-impersonated-user-id'] as string;
  
  // Verify admin credentials if impersonating
  if (isAdminImpersonating && impersonatedUserId && adminEmails.length > 0) {
    if (adminEmails.includes(session.user?.email || '')) {
      // Allow admin to impersonate
      userId = impersonatedUserId;
    } else {
      return res.status(403).json({ message: 'Not authorized to impersonate users' });
    }
  }

  try {
    // GET - Fetch all projects for the authenticated user
    if (req.method === "GET") {
      const projects = await prisma.project.findMany({
        where: {
          user_id: userId,
        },
        orderBy: {
          updated_at: "desc",
        },
      });
      
      return res.status(200).json({ projects });
    }
    
    // POST - Create a new project
    if (req.method === "POST") {
      const validatedData = createProjectSchema.parse(req.body);
      
      // If admin is providing a user_id, verify admin credentials
      if (validatedData.user_id && validatedData.user_id !== userId && adminEmails.length > 0) {
        if (!adminEmails.includes(session.user?.email || '')) {
          return res.status(403).json({ message: 'Not authorized to create projects for other users' });
        }
        
        // Admin is verified, use the provided user_id
        userId = validatedData.user_id;
      }

      // First, create the project
      const newProject = await prisma.project.create({
        data: {
          user_id: userId,
          project_title: validatedData.project_title,
          project_description: validatedData.project_description,
          tags: validatedData.tags,
        },
      });

      // Define stages - use custom stages if provided, otherwise use default stages
      const stageNames: StageName[] = customStages.length > 0 
        ? customStages 
        : [
            StageName.Ideation,
            StageName.Planning,
            StageName.Research,
            StageName.Development,
            StageName.Testing,
            StageName.Deployment,
            StageName.Maintenance,
            StageName.Review,
          ];

      // Create stages one by one with better error handling
      for (const stageName of stageNames) {
        try {
          await prisma.projectStage.create({
            data: {
              project_id: newProject.id,
              stage_name: stageName,
              user_inputs: {},
              ai_outputs: {},
              finalized: false,
            },
          });
        } catch (stageError) {
          console.error(`Error creating stage ${stageName}:`, stageError);
          // Continue creating other stages even if one fails
        }
      }

      return res.status(201).json({
        message: "Project created successfully",
        project: newProject,
      });
    }

    // Method not allowed
    return res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }

    console.error("Project API error:", error);
    return res.status(500).json({ 
      message: "Internal server error", 
      error: error instanceof Error ? error.message : String(error) 
    });
  } finally {
    await prisma.$disconnect();
  }
}

// Default export for API route
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Import authOptions dynamically to avoid circular dependencies
  const { authOptions } = await import('../auth/[...nextauth]');
  
  // Use the project handler with default settings
  return projectHandler(req, res, authOptions);
}
