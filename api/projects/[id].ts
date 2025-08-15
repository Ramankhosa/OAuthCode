import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";

// Initialize Prisma client
const prisma = new PrismaClient();

// Schema for project update validation
const updateProjectSchema = z.object({
  project_title: z.string().min(1, "Project title is required").optional(),
  project_description: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * Project detail handler function that can be used directly or customized
 * @param req NextApiRequest
 * @param res NextApiResponse
 * @param authOptions NextAuth options
 * @param corsEnabled Whether to enable CORS
 * @param corsOrigin CORS origin to allow
 */
export async function projectDetailHandler(
  req: NextApiRequest,
  res: NextApiResponse,
  authOptions: any,
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

  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ message: "Invalid project ID" });
  }

  try {
    // Check if the project belongs to the user
    const project = await prisma.project.findFirst({
      where: {
        id,
        user_id: session.user.id as string,
      },
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // GET - Fetch a specific project with its stages
    if (req.method === "GET") {
      const projectWithStages = await prisma.project.findUnique({
        where: { id },
        include: {
          stages: {
            orderBy: {
              stage_name: "asc",
            },
          },
        },
      });

      return res.status(200).json({ project: projectWithStages });
    }

    // PUT - Update a project
    if (req.method === "PUT") {
      const validatedData = updateProjectSchema.parse(req.body);

      const updatedProject = await prisma.project.update({
        where: { id },
        data: {
          ...(validatedData.project_title && { project_title: validatedData.project_title }),
          ...(validatedData.project_description !== undefined && { 
            project_description: validatedData.project_description 
          }),
          ...(validatedData.tags && { tags: validatedData.tags }),
          updated_at: new Date(),
        },
      });

      return res.status(200).json({
        message: "Project updated successfully",
        project: updatedProject,
      });
    }

    // DELETE - Delete a project and its stages
    if (req.method === "DELETE") {
      // First delete all stages (although this should cascade)
      await prisma.projectStage.deleteMany({
        where: { project_id: id },
      });

      // Then delete the project
      await prisma.project.delete({
        where: { id },
      });

      return res.status(200).json({ message: "Project deleted successfully" });
    }

    // Method not allowed
    return res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }

    console.error("Project API error:", error);
    return res.status(500).json({ message: "Internal server error" });
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
  
  // Use the project detail handler with default settings
  return projectDetailHandler(req, res, authOptions);
}
