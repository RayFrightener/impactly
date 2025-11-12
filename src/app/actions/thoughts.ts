"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { CreateThoughtInput, UpdateThoughtInput } from "@/types";

async function verifyProjectOwnership(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId: userId,
    },
  });
  return !!project;
}

export async function createThought(data: CreateThoughtInput) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const isOwner = await verifyProjectOwnership(data.projectId, session.user.id);
  if (!isOwner) {
    throw new Error("Project not found");
  }

  const thought = await prisma.thought.create({
    data: {
      text: data.text,
      expanded: data.expanded,
      projectId: data.projectId,
    },
  });

  revalidatePath("/dashboard");
  return thought;
}

export async function updateThought(thoughtId: string, data: UpdateThoughtInput) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Verify ownership through project
  const thought = await prisma.thought.findUnique({
    where: { id: thoughtId },
    include: { project: true },
  });

  if (!thought || thought.project.userId !== session.user.id) {
    throw new Error("Thought not found");
  }

  const updated = await prisma.thought.update({
    where: { id: thoughtId },
    data: {
      ...data,
    },
  });

  revalidatePath("/dashboard");
  return updated;
}

export async function deleteThought(thoughtId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Verify ownership
  const thought = await prisma.thought.findUnique({
    where: { id: thoughtId },
    include: { project: true },
  });

  if (!thought || thought.project.userId !== session.user.id) {
    throw new Error("Thought not found");
  }

  await prisma.thought.delete({
    where: { id: thoughtId },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Get all thoughts for a project
 */
export async function getThoughts(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const isOwner = await verifyProjectOwnership(projectId, session.user.id);
  if (!isOwner) {
    throw new Error("Project not found");
  }

  const thoughts = await prisma.thought.findMany({
    where: {
      projectId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return thoughts;
}
