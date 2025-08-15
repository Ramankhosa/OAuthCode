import { StageName } from '@prisma/client';

export interface Project {
  id: string;
  user_id: string;
  project_title: string;
  project_description?: string | null;
  tags: string[];
  created_at: Date;
  updated_at: Date;
  stages?: ProjectStage[];
}

export interface ProjectStage {
  id: string;
  project_id: string;
  stage_name: StageName;
  user_inputs: Record<string, any>;
  ai_outputs: Record<string, any>;
  finalized: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateProjectInput {
  project_title: string;
  project_description?: string | null;
  tags?: string[];
  user_id?: string; // Optional for admin impersonation
}

export interface UpdateProjectInput {
  project_title?: string;
  project_description?: string | null;
  tags?: string[];
}

export interface ProjectResponse {
  message: string;
  project: Project;
}

export interface ProjectsResponse {
  projects: Project[];
}
