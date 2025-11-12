"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { trackProjectCreated, trackProjectCompleted } from "./analytics";
import type {
  CreateProjectInput,
  UpdateProjectInput,
  ProjectWithRelations,
} from "@/types";

export async function createProject(data: CreateProjectInput) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const project = await prisma.project.create({
    data: {
      name: data.name,
      description: data.description,
      moreInfo: data.moreInfo,
      status: data.status || "ACTIVE",
      userId: session.user.id,
    },
  });

  // Track analytics
  await trackProjectCreated(project.id);

  revalidatePath("/dashboard");
  return project;
}

export async function getProjects(): Promise<ProjectWithRelations[]> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const projects = await prisma.project.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      thoughts: true,
      features: {
        include: {
          tasks: true,
        },
      },
      tasks: true,
      timeline: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return projects as ProjectWithRelations[];
}

export async function getProject(
  projectId: string
): Promise<ProjectWithRelations | null> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId: session.user.id,
    },
    include: {
      thoughts: true,
      features: {
        include: {
          tasks: true,
        },
      },
      tasks: true,
      timeline: true,
    },
  });

  return project as ProjectWithRelations | null;
}

export async function updateProject(
  projectId: string,
  data: UpdateProjectInput
) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Verify ownership
  const existing = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId: session.user.id,
    },
  });

  if (!existing) {
    throw new Error("Project not found");
  }

  const project = await prisma.project.update({
    where: {
      id: projectId,
    },
    data: {
      ...data,
    },
  });

  // Track if project was completed (moved to ARCHIVED)
  if (existing.status !== "ARCHIVED" && data.status === "ARCHIVED") {
    await trackProjectCompleted(project.id);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${projectId}`);
  return project;
}

export async function deleteProject(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Verify ownership
  const existing = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId: session.user.id,
    },
  });

  if (!existing) {
    throw new Error("Project not found");
  }

  await prisma.project.delete({
    where: {
      id: projectId,
    },
  });

  revalidatePath("/dashboard");
  return { success: true };
}
